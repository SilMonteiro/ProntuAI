import React, { useCallback, useEffect, useState } from 'react';
import { buscarPacientes, cadastrarPaciente, entrarNaFila, listarFila, sairDaFila } from '../services/recepcao.js';

const PRIORIDADES = [
  ['normal', 'Normal'],
  ['preferencial', 'Preferencial (idoso, gestante, PcD)'],
  ['urgente', 'Urgente'],
];
const PRIORIDADE_BADGE = { normal: 'badge-soft', preferencial: 'badge-attention', urgente: 'badge-critical' };
const PRIORIDADE_LABEL = { normal: 'Normal', preferencial: 'Preferencial', urgente: 'Urgente' };
const REFRESH_MS = 10000;

const EMPTY_FORM = { nome: '', data_nascimento: '', sexo: '', cpf: '', telefone: '', convenio: 'Particular' };

function maskCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskTel(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const cut = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, cut)}-${d.slice(cut)}`;
}

function idade(iso) {
  const n = new Date(iso);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos -= 1;
  return anos;
}

function hora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function espera(iso, agora) {
  const min = Math.max(0, Math.floor((agora - new Date(iso)) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

function iniciais(nome) {
  const p = nome.split(' ').filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

function CadastroForm({ initialNome, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, nome: initialNome });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await cadastrarPaciente(form));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className="rec-form" onSubmit={submit}>
      <div className="field rec-span">
        <label htmlFor="rc-nome">Nome completo</label>
        <input id="rc-nome" className="input" value={form.nome} onChange={set('nome')} required minLength={3} maxLength={120} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="rc-nasc">Data de nascimento</label>
        <input id="rc-nasc" className="input" type="date" value={form.data_nascimento} onChange={set('data_nascimento')} required max={new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="field">
        <label htmlFor="rc-sexo">Sexo</label>
        <select id="rc-sexo" className="input" value={form.sexo} onChange={set('sexo')} required>
          <option value="" disabled>Selecione</option>
          <option>Feminino</option>
          <option>Masculino</option>
          <option>Outro</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="rc-cpf">CPF</label>
        <input id="rc-cpf" className="input" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))} required />
      </div>
      <div className="field">
        <label htmlFor="rc-tel">Telefone</label>
        <input id="rc-tel" className="input" inputMode="tel" placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: maskTel(e.target.value) }))} />
      </div>
      <div className="field rec-span">
        <label htmlFor="rc-conv">Convênio</label>
        <input id="rc-conv" className="input" value={form.convenio} onChange={set('convenio')} maxLength={60} />
      </div>
      {error && <p className="rec-error rec-span" role="alert">{error}</p>}
      <div className="rec-actions rec-span">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn-cobalt" disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar paciente'}</button>
      </div>
    </form>
  );
}

export default function Recepcao() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [prioridade, setPrioridade] = useState('normal');
  const [creating, setCreating] = useState(false);
  const [fila, setFila] = useState([]);
  const [agora, setAgora] = useState(() => new Date());
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadFila = useCallback(async () => {
    try {
      setFila(await listarFila());
      setAgora(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadFila();
    const id = setInterval(loadFila, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadFila]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await buscarPacientes(query);
        if (!cancelled) {
          setResults(data);
          setSearched(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3000);
  };

  const naFila = (id) => fila.some((f) => f.paciente_id === id);

  const colocar = async (paciente) => {
    setError(null);
    try {
      await entrarNaFila(paciente.id, prioridade);
      flash(`${paciente.nome} foi colocado(a) na fila de espera.`);
      setSelected(null);
      setPrioridade('normal');
      loadFila();
    } catch (err) {
      setError(err.message);
      loadFila();
    }
  };

  const remover = async (item) => {
    if (!window.confirm(`Remover ${item.nome} da fila de espera?`)) return;
    setError(null);
    try {
      await sairDaFila(item.id);
    } catch (err) {
      setError(err.message);
    }
    loadFila();
  };

  const onSaved = (paciente) => {
    setCreating(false);
    setQuery('');
    setResults((r) => [paciente, ...r]);
    setSelected(paciente);
    flash(`${paciente.nome} cadastrado(a) — prontuário nº ${paciente.prontuario}.`);
  };

  return (
    <div className="rec-grid">
      <section className="card" aria-label="Paciente">
        <div className="card-head">
          <div>
            <h2 className="h-sm">Chegada de paciente</h2>
            <p className="muted small">Busque pelo nome ou CPF. Se não houver cadastro, cadastre o paciente.</p>
          </div>
        </div>

        {creating ? (
          <CadastroForm initialNome={/\d/.test(query) ? '' : query} onSaved={onSaved} onCancel={() => setCreating(false)} />
        ) : (
          <>
            <div className="field">
              <label htmlFor="rc-busca">Buscar paciente</label>
              <input id="rc-busca" className="input" type="search" placeholder="Nome ou CPF" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} autoComplete="off" />
            </div>

            <ul className="rec-results" aria-label="Resultados da busca">
              {results.map((p) => {
                const ativo = selected?.id === p.id;
                return (
                  <li key={p.id}>
                    <button type="button" className={`rec-result ${ativo ? 'current' : ''}`} aria-pressed={ativo} onClick={() => setSelected(ativo ? null : p)}>
                      <span className="avatar xs">{iniciais(p.nome)}</span>
                      <span className="pm-text">
                        <strong>{p.nome}</strong>
                        <span className="muted small">
                          {idade(p.data_nascimento)} anos · {p.sexo} · Prontuário nº {p.prontuario} · {p.convenio}
                        </span>
                      </span>
                      {naFila(p.id) && <span className="badge badge-warning">Na fila</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            {searched && results.length === 0 && (
              <p className="muted small rec-empty">
                {query.trim() ? 'Nenhum paciente encontrado com esse nome ou CPF.' : 'Nenhum paciente cadastrado ainda.'}
              </p>
            )}

            {selected && (
              <div className="rec-queue-box">
                <div className="field">
                  <label htmlFor="rc-prio">Prioridade</label>
                  <select id="rc-prio" className="input" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                    {PRIORIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <button type="button" className="btn btn-cobalt" disabled={naFila(selected.id)} onClick={() => colocar(selected)}>
                  {naFila(selected.id) ? 'Já está na fila' : 'Colocar na fila de espera'}
                </button>
              </div>
            )}

            <button type="button" className="btn btn-ghost rec-new" onClick={() => setCreating(true)}>
              + Cadastrar novo paciente
            </button>
          </>
        )}
      </section>

      <section className="card" aria-label="Fila de espera">
        <div className="card-head">
          <div>
            <h2 className="h-sm">Fila de espera</h2>
            <p className="muted small">Ordenada por prioridade e horário de chegada</p>
          </div>
          <span className="badge badge-soft">{fila.length} {fila.length === 1 ? 'paciente' : 'pacientes'}</span>
        </div>

        {fila.length === 0 ? (
          <p className="muted rec-empty">Nenhum paciente aguardando atendimento.</p>
        ) : (
          <ol className="rec-fila">
            {fila.map((f, i) => (
              <li key={f.id} className="rec-fila-item">
                <span className="rec-pos" aria-label={`Posição ${i + 1}`}>{i + 1}</span>
                <span className="pm-text">
                  <strong>{f.nome}</strong>
                  <span className="muted small">Chegou às {hora(f.chegada)} · aguardando há {espera(f.chegada, agora)}</span>
                </span>
                <span className={`badge ${PRIORIDADE_BADGE[f.prioridade]}`}>{PRIORIDADE_LABEL[f.prioridade]}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remover(f)} aria-label={`Remover ${f.nome} da fila`}>
                  Remover
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {error && <div className="toast rec-toast-error" role="alert" onClick={() => setError(null)}>{error}</div>}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
