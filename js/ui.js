// Utilitários de interface: formatação, ícones, toast, downloads.

const fmtEuro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const euro = (v) => fmtEuro.format(v);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const opData = { day: '2-digit', month: '2-digit', year: 'numeric' };
const opHora = { hour: '2-digit', minute: '2-digit' };
export const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-PT', opData);
export const hora = (iso) => new Date(iso).toLocaleTimeString('pt-PT', opHora);
export const dataHora = (iso) => `${dataCurta(iso)} às ${hora(iso)}`;
// 'YYYY-MM-DD' → '20/10' (sem problemas de fuso horário)
export const diaMes = (ymd) => ymd.split('-').reverse().slice(0, 2).join('/');
export const diaMesAno = (ymd) => ymd.split('-').reverse().join('/');

export function relativo(iso, agora = new Date()) {
  const d = new Date(iso);
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((dia(d) - dia(agora)) / 86400000);
  if (diff === 0) return d <= agora ? `Hoje, ${hora(iso)}` : `Hoje às ${hora(iso)}`;
  if (diff === 1) return `Amanhã às ${hora(iso)}`;
  if (diff === -1) return 'Ontem';
  if (diff < 0) return `Há ${-diff} dias`;
  return `Daqui a ${diff} dias`;
}

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const soDigitos = (tel) => String(tel || '').replace(/[^\d+]/g, '');

export function linkWhatsApp(tel) {
  let d = soDigitos(tel).replace(/^\+/, '').replace(/^00/, '');
  if (/^9\d{8}$/.test(d)) d = `351${d}`; // telemóvel português sem indicativo
  return `https://wa.me/${d}`;
}

export const limparNome = (t) => String(t || '').trim().replace(/\s+/g, ' ');
export const limparTelefone = (t) => String(t || '').trim().replace(/[^\d+\s]/g, '').replace(/\s+/g, ' ').trim();

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visivel'), 2800);
}

export function descarregar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const P = {
  mais: '<path d="M12 5v14M5 12h14"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mensagem: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>',
  copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  colar: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  descarregar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  partilhar: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  lapis: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  sino: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  certo: '<path d="M20 6 9 17l-5-5"/>',
  enviar: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  casa: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  nota: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
};
export const icone = (n) => `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
