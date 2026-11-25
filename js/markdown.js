/* Conversor de Markdown simples e seguro (sem bibliotecas).
   Todo o texto é escapado antes; só as marcações conhecidas viram HTML.
   Suporta: títulos, negrito, itálico, riscado, código, blocos de código,
   listas, listas numeradas, checklists, citações, links e linha horizontal. */

const Markdown = (() => {
  const escapar = (t) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function inline(texto) {
    const codigos = [];
    let t = escapar(texto).replace(/`([^`]+)`/g, (_, c) => { codigos.push(c); return `\u0000${codigos.length - 1}\u0000`; });
    t = t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
      .replace(/(^|\W)_([^_\s][^_]*?)_(?=\W|$)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codigos[i]}</code>`);
  }

  function converter(md) {
    const linhas = md.replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    let i = 0;
    while (i < linhas.length) {
      const linha = linhas[i];

      // Bloco de código ```
      if (/^```/.test(linha)) {
        const lang = escapar(linha.slice(3).trim());
        const corpo = [];
        i++;
        while (i < linhas.length && !/^```/.test(linhas[i])) corpo.push(linhas[i++]);
        i++;
        html.push(`<pre><code${lang ? ` data-lang="${lang}"` : ''}>${escapar(corpo.join('\n'))}</code></pre>`);
        continue;
      }
      // Título
      const h = linha.match(/^(#{1,6})\s+(.*)$/);
      if (h) { html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      // Linha horizontal
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(linha)) { html.push('<hr>'); i++; continue; }
      // Citação
      if (/^>\s?/.test(linha)) {
        const bloco = [];
        while (i < linhas.length && /^>\s?/.test(linhas[i])) bloco.push(linhas[i++].replace(/^>\s?/, ''));
        html.push(`<blockquote>${converter(bloco.join('\n'))}</blockquote>`);
        continue;
      }
      // Listas (com checklist)
      if (/^\s*([-*+]|\d+[.)])\s+/.test(linha)) {
        const numerada = /^\s*\d+[.)]/.test(linha);
        const itens = [];
        while (i < linhas.length && /^\s*([-*+]|\d+[.)])\s+/.test(linhas[i])) {
          const conteudo = linhas[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
          const tarefa = conteudo.match(/^\[( |x|X)\]\s+(.*)$/);
          itens.push(tarefa
            ? `<li class="tarefa"><input type="checkbox" data-linha="${i}" ${tarefa[1] !== ' ' ? 'checked' : ''}> <span>${inline(tarefa[2])}</span></li>`
            : `<li>${inline(conteudo)}</li>`);
          i++;
        }
        html.push(numerada ? `<ol>${itens.join('')}</ol>` : `<ul>${itens.join('')}</ul>`);
        continue;
      }
      // Linha em branco
      if (!linha.trim()) { i++; continue; }
      // Parágrafo (junta linhas seguidas)
      const par = [];
      while (i < linhas.length && linhas[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s+)/.test(linhas[i]) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(linhas[i])) par.push(linhas[i++]);
      html.push(`<p>${par.map(inline).join('<br>')}</p>`);
    }
    return html.join('\n');
  }

  return { converter };
})();
