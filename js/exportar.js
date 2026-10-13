// Exportação CSV compatível com Excel em português (separador ";" e UTF-8 com BOM).
import { PLANOS, STATUS } from './config.js';
import { dataHora, hojeISO, diaMesAno } from './ui.js';
import { instalado } from './calculos.js';

function celula(v) {
  let s = String(v ?? '');
  if (/^[=@]/.test(s)) s = `'${s}`; // evita fórmulas acidentais no Excel
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCSV(lista) {
  const cabecalho = ['Data da indicação', 'Cliente', 'Contacto', 'Plano', 'Status', 'Data da instalação', 'Comissão (€)',
    'Comissão recebida (€)', 'Comissão a receber (€)', 'Notas', 'Lembrete', 'Lembrete concluído', 'Última alteração'];
  const linhas = lista.map((i) => {
    const p = PLANOS[i.plano];
    const pago = instalado(i);
    return [
      dataHora(i.dataIndicacao), i.nome, i.telefone, p.nome, STATUS[i.status].nome,
      i.status === 'fechado' && i.instalacao?.data ? diaMesAno(i.instalacao.data) : '',
      p.comissao, pago ? p.comissao : 0, i.status === 'fechado' && !pago ? p.comissao : 0,
      i.notas || '',
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
