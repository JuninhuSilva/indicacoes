// Exportação CSV compatível com Excel em português (separador ";" e UTF-8 com BOM).
import { PLANOS, STATUS } from './config.js';
import { dataHora, hojeISO } from './ui.js';

function celula(v) {
  let s = String(v ?? '');
  if (/^[=@]/.test(s)) s = `'${s}`; // evita fórmulas acidentais no Excel
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCSV(lista) {
  const cabecalho = ['Data da indicação', 'Cliente', 'Contacto', 'Plano', 'Status', 'Comissão (€)', 'Comissão recebida (€)', 'Lembrete', 'Lembrete concluído', 'Última alteração'];
  const linhas = lista.map((i) => {
    const p = PLANOS[i.plano];
    return [
      dataHora(i.dataIndicacao), i.nome, i.telefone, p.nome, STATUS[i.status].nome,
      p.comissao, i.status === 'fechado' ? p.comissao : 0,
      i.lembrete ? dataHora(i.lembrete.quando) : '',
      i.lembrete ? (i.lembrete.feito ? 'Sim' : 'Não') : '',
      dataHora(i.atualizado || i.dataIndicacao),
    ];
  });
  return '﻿' + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
}

export const nomeFicheiroCSV = () => `indicacoes-${hojeISO()}.csv`;

export function podePartilhar() {
  try {
    return !!navigator.canShare?.({ files: [new File(['x'], 'x.csv', { type: 'text/csv' })] });
  } catch { return false; }
}
