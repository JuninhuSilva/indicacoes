// Configuração central: planos, comissões, status e prazos.
// Para mudar valores de comissão, basta editar aqui.

export const PLANOS = {
  '4P': { id: '4P', nome: '4P', descricao: 'Internet, TV, telefone fixo e telemóvel', comissao: 180, prioritario: true },
  '3P': { id: '3P', nome: '3P', descricao: 'Internet, TV e telefone fixo', comissao: 120, prioritario: true },
  '1P2P': { id: '1P2P', nome: '1P/2P', descricao: 'Internet e telefone fixo', comissao: 80, prioritario: false },
};

export const STATUS = {
  indicado: { id: 'indicado', nome: 'Indicado', aberto: true },
  negociacao: { id: 'negociacao', nome: 'Em negociação', aberto: true },
  fechado: { id: 'fechado', nome: 'Fechado', aberto: false },
  perdido: { id: 'perdido', nome: 'Perdido', aberto: false },
};

export const PRAZOS = [
  { dias: 3, nome: '3 dias' },
  { dias: 7, nome: '1 semana' },
  { dias: 14, nome: '2 semanas' },
  { dias: 30, nome: '1 mês' },
];

export const PRAZO_PADRAO = 7;
export const HORA_LEMBRETE = 10; // hora a que os lembretes por prazo disparam
export const HORA_INSTALACAO = 9; // hora da notificação no dia da instalação (manter igual no sw.js)

// Partilhado com o sw.js (manter iguais).
export const DB = { nome: 'controlo-indicacoes', versao: 1, store: 'indicacoes' };
