/* MarkNotes — notas em Markdown com prévia em tempo real. O conversor está em js/markdown.js */

const CHAVE = 'marknotes_notas';
const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PINO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Fixada"><path d="M8 3h8l-1 6 3 4h-5v8l-1 1-1-1v-8H6l3-4z"/></svg>';

const banco = {
  ler() { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch { return null; } },
  salvar(v) { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch { /* sem storage */ } }
};

const BOAS_VINDAS = `# Bem-vindo ao MarkNotes

Escreva à esquerda e veja o resultado **formatado** à direita, em tempo real.

## O que dá pra fazer

- **Negrito**, *itálico* e ~~riscado~~
- Listas, citações e \`código\`
- Links como [este aqui](https://www.markdownguide.org)

## Checklist

- [x] Criar a primeira nota
- [ ] Testar a barra de ferramentas
- [ ] Baixar a nota em .md

> Dica: as caixas da checklist podem ser marcadas direto na prévia.

\`\`\`js
console.log('Olá, Markdown!');
\`\`\`
`;

let notas = banco.ler() ?? [
  { id: 1, texto: BOAS_VINDAS, fixada: true, editada: Date.now() },
  { id: 2, texto: '# Lista de compras\n\n- [ ] Café\n- [ ] Pão\n- [x] Frutas\n', fixada: false, editada: Date.now() - 864e5 }
];
let atualId = notas[0]?.id;
let timerSalvar = null;

const atual = () => notas.find((n) => n.id === atualId);
const titulo = (t) => (t.split('\n').find((l) => l.trim()) || 'Nota sem título').replace(/^#+\s*/, '').replace(/[*_~`>[\]]/g, '').trim().slice(0, 60) || 'Nota sem título';
const resumo = (t) => t.split('\n').filter((l) => l.trim()).slice(1, 2).join(' ').replace(/[#*_~`>[\]-]/g, '').trim().slice(0, 70);

function quando(ts) {
  const d = new Date(ts), hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function renderLista() {
  const termo = $('#busca').value.trim().toLowerCase();
  const lista = notas.filter((n) => !termo || n.texto.toLowerCase().includes(termo))
    .sort((a, b) => (b.fixada - a.fixada) || b.editada - a.editada);
  $('#notas').innerHTML = lista.length ? lista.map((n) => `
    <li><button class="nota ${n.id === atualId ? 'ativa' : ''}" data-id="${n.id}">
      <b>${n.fixada ? PINO : ''}${escapar(titulo(n.texto))}</b>
      <small>${escapar(resumo(n.texto)) || '&nbsp;'}</small>
      <time>${quando(n.editada)}</time>
    </button></li>`).join('') : `<li class="nenhuma">${termo ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda.'}</li>`;
}

function renderPrevia() {
  const n = atual();
  $('#previa').innerHTML = n && n.texto.trim() ? Markdown.converter(n.texto) : '<p class="vazio-previa">A prévia aparece aqui enquanto você escreve.</p>';
  const palavras = n ? (n.texto.match(/\S+/g) || []).length : 0;
  $('#contagem').textContent = `${palavras} palavra${palavras === 1 ? '' : 's'} · ${n ? n.texto.length : 0} caracteres · ~${Math.max(1, Math.round(palavras / 200))} min de leitura`;
  $('#fixar').classList.toggle('ligado', Boolean(n?.fixada));
}

function abrir(id) {
  atualId = id;
  $('#editor').value = atual()?.texto ?? '';
  renderLista(); renderPrevia();
  $('#app').classList.remove('lista-aberta');
}

function salvarDepois() {
  $('#salvo').textContent = 'Salvando...'; $('#salvo').classList.add('salvando');
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => {
    banco.salvar(notas);
    $('#salvo').textContent = `Salvo às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    $('#salvo').classList.remove('salvando');
    renderLista();
  }, 400);
}

$('#editor').addEventListener('input', () => {
  const n = atual(); if (!n) return;
  n.texto = $('#editor').value; n.editada = Date.now();
  renderPrevia(); salvarDepois();
});

$('#notas').addEventListener('click', (e) => { const b = e.target.closest('.nota'); if (b) abrir(Number(b.dataset.id)); });
$('#busca').addEventListener('input', renderLista);

function novaNota() {
  const n = { id: Date.now(), texto: '# ', fixada: false, editada: Date.now() };
  notas.unshift(n); banco.salvar(notas); abrir(n.id);
  $('#editor').focus(); $('#editor').setSelectionRange(2, 2);
}
$('#nova').addEventListener('click', novaNota);

$('#excluir').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!b.dataset.ok) { b.dataset.ok = '1'; b.title = 'Clique de novo para excluir'; b.classList.add('ligado'); setTimeout(() => { delete b.dataset.ok; b.title = 'Excluir nota'; b.classList.remove('ligado'); }, 2500); return; }
  delete b.dataset.ok; b.classList.remove('ligado');
  notas = notas.filter((n) => n.id !== atualId);
  if (!notas.length) notas.push({ id: Date.now(), texto: '', fixada: false, editada: Date.now() });
  banco.salvar(notas); abrir(notas[0].id);
});
$('#fixar').addEventListener('click', () => { const n = atual(); n.fixada = !n.fixada; banco.salvar(notas); renderLista(); renderPrevia(); });

// Baixar como arquivo .md
$('#baixar').addEventListener('click', () => {
  const n = atual(); if (!n) return;
  const nome = titulo(n.texto).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'nota';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([n.texto], { type: 'text/markdown' }));
  a.download = `${nome}.md`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// Checklist clicável na prévia: altera o texto da nota
$('#previa').addEventListener('change', (e) => {
  if (!e.target.matches('input[data-linha]')) return;
  const n = atual(); const linhas = n.texto.split('\n'); const i = Number(e.target.dataset.linha);
  linhas[i] = linhas[i].replace(/\[( |x|X)\]/, e.target.checked ? '[x]' : '[ ]');
  n.texto = linhas.join('\n'); n.editada = Date.now();
  $('#editor').value = n.texto; renderPrevia(); salvarDepois();
});

/* ---------- Barra de formatação ---------- */
function envolver(antes, depois = antes, exemplo = 'texto') {
  const ed = $('#editor'); const [a, b] = [ed.selectionStart, ed.selectionEnd];
  const sel = ed.value.slice(a, b) || exemplo;
  ed.setRangeText(antes + sel + depois, a, b, 'end');
  ed.setSelectionRange(a + antes.length, a + antes.length + sel.length);
  ed.focus(); ed.dispatchEvent(new Event('input'));
}
function prefixarLinhas(fn) {
  const ed = $('#editor');
  const ini = ed.value.lastIndexOf('\n', ed.selectionStart - 1) + 1;
  let fim = ed.value.indexOf('\n', ed.selectionEnd); if (fim === -1) fim = ed.value.length;
  const bloco = ed.value.slice(ini, fim).split('\n').map(fn).join('\n');
  ed.setRangeText(bloco, ini, fim, 'end'); ed.focus(); ed.dispatchEvent(new Event('input'));
}
const ACOES = {
  h: () => prefixarLinhas((l) => (/^#{1,5}\s/.test(l) ? `#${l}` : /^######\s/.test(l) ? l.replace(/^#+\s/, '') : `## ${l}`)),
  b: () => envolver('**'), i: () => envolver('*'), s: () => envolver('~~'),
  code: () => { const ed = $('#editor'); ed.value.slice(ed.selectionStart, ed.selectionEnd).includes('\n') ? envolver('```\n', '\n```', 'código') : envolver('`', '`', 'código'); },
  link: () => envolver('[', '](https://)', 'texto do link'),
  ul: () => prefixarLinhas((l) => `- ${l}`),
  ol: () => { let n = 1; prefixarLinhas((l) => `${n++}. ${l}`); },
  task: () => prefixarLinhas((l) => `- [ ] ${l}`),
  quote: () => prefixarLinhas((l) => `> ${l}`)
};
document.querySelector('.ferramentas').addEventListener('click', (e) => { const b = e.target.closest('[data-fmt]'); if (b) ACOES[b.dataset.fmt](); });
$('#editor').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); ACOES.b(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); ACOES.i(); }
  if (e.key === 'Tab') { e.preventDefault(); $('#editor').setRangeText('  ', $('#editor').selectionStart, $('#editor').selectionEnd, 'end'); }
  // Enter numa lista continua a lista
  if (e.key === 'Enter') {
    const ed = $('#editor'); const ini = ed.value.lastIndexOf('\n', ed.selectionStart - 1) + 1;
    const linha = ed.value.slice(ini, ed.selectionStart);
    const m = linha.match(/^(\s*)([-*+] \[[ xX]\] |[-*+] |(\d+)[.)] )/);
    if (!m) return;
    e.preventDefault();
    if (linha.trim() === m[2].trim()) { ed.setRangeText('', ini, ed.selectionStart, 'end'); ed.dispatchEvent(new Event('input')); return; }
    const prox = m[3] ? `${Number(m[3]) + 1}. ` : m[2].replace(/\[[xX]\]/, '[ ]');
    ed.setRangeText(`\n${m[1]}${prox}`, ed.selectionStart, ed.selectionEnd, 'end'); ed.dispatchEvent(new Event('input'));
  }
});
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); novaNota(); } });

/* ---------- Modos de visualização ---------- */
function trocarModo(m) {
  $('#paineis').className = `paineis modo-${m}`;
  document.querySelectorAll('.modos button').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === m));
  try { localStorage.setItem('marknotes_modo', m); } catch { /* sem storage */ }
}
document.querySelector('.modos').addEventListener('click', (e) => { const b = e.target.closest('[data-modo]'); if (b) trocarModo(b.dataset.modo); });
$('#mostrar-lista').addEventListener('click', () => $('#app').classList.toggle('lista-aberta'));

let modoSalvo = 'dividir';
try { modoSalvo = localStorage.getItem('marknotes_modo') || 'dividir'; } catch { /* sem storage */ }
trocarModo(modoSalvo);
banco.salvar(notas);
abrir(atualId);
