import React from 'react';
import { IconCheck, IconPrint, Logo, LogoNome } from './Icons.jsx';
import { MEDICO } from '../data/mock.js';

function Block({ title, children }) {
  return (
    <section className="sh-block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

const Row = ({ label, children }) => (
  <p className="sh-row">
    <b>{label}:</b> {children}
  </p>
);

// Exporta o prontuário homologado como texto simples (.txt).
function exportTxt(draft) {
  const { ident, s, o, a, p } = draft;
  const cids = a.cids.filter((c) => c.status === 'Aceita').map((c) => `${c.code} - ${c.desc}`);
  const rx = p.rx.map((r) => `${r.med} - ${r.pos}`);
  const lines = [
    'PRONTUÁRIO MÉDICO - EVOLUÇÃO SOAP (HOMOLOGADO)',
    '',
    `Paciente: ${ident.nome}`,
    `Idade: ${ident.idade}`,
    `Data e hora da consulta: ${ident.dataHora}`,
    `Médico: ${MEDICO.nome} - ${MEDICO.crm}`,
    `Homologado em: ${draft.homologadoEm}`,
    '',
    'S - SUBJETIVO',
    `Queixa principal: ${s.qp}`,
    `História da doença atual (HDA): ${s.hma}`,
    `Histórico pregresso e comorbidades: ${s.hist}`,
    `Alergias: ${s.alergias}`,
    `Medicamentos em uso: ${s.meds}`,
    `Histórico familiar e hábitos: ${s.habitos}`,
    '',
    'O - OBJETIVO',
    `Sinais vitais: ${o.sinais}`,
    `Exame físico: ${o.exame}`,
    `Exames complementares: ${o.comp}`,
    '',
    'A - AVALIAÇÃO',
    `Hipótese diagnóstica: ${a.hip}`,
    `CID-10: ${cids.length ? cids.join('; ') : 'Nenhum CID confirmado'}`,
    '',
    'P - PLANO TERAPÊUTICO',
    `Prescrição: ${rx.length ? rx.join(' | ') : 'Sem prescrição medicamentosa nesta consulta'}`,
    `Exames solicitados: ${p.exames.length ? p.exames.map((e) => e.text).join('; ') : 'Nenhum exame solicitado'}`,
    `Orientações e encaminhamentos: ${p.orient}`,
    '',
    'Prontuário elaborado com apoio de IA e revisado e aprovado pelo médico.',
  ];
  const blob = new Blob([lines.join(String.fromCharCode(10))], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prontuario-${ident.nome.replace(/\s+/g, '-').toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function FinalView({ draft, patient, conflicts, alertAcked, startedAt, onRestart }) {
  const { ident, s, o, a, p } = draft;
  const cids = a.cids.filter((c) => c.status === 'Aceita');

  return (
    <div className="final">
      <div className="final-toolbar no-print">
        <div className="final-ok">
          <div>
            <strong>Prontuário homologado</strong>
            <p className="muted small">Revisado e aprovado por {MEDICO.nome}. Registro imutável salvo no histórico do paciente.</p>
          </div>
        </div>
        <div className="final-actions">
          <button type="button" className="btn btn-ghost" onClick={() => exportTxt(draft)}>Exportar</button>
          <button type="button" className="btn btn-secondary" onClick={onRestart}>Nova consulta</button>
          <button type="button" className="btn btn-cobalt" onClick={() => window.print()}>
            <IconPrint /> Imprimir
          </button>
        </div>
      </div>

      <article className="sheet">
        <header className="sh-head">
          <div>
            <h2>Prontuário médico — Evolução SOAP</h2>
          </div>
          <div className="sh-logo">
            <Logo size={28} />
            <LogoNome height={20} />
          </div>
        </header>

        <section className="sh-ident">
          <Row label="Paciente">{ident.nome}</Row>
          <Row label="Idade">{ident.idade}</Row>
          <Row label="Sexo">{patient.sexo}</Row>
          <Row label="Prontuário nº">{patient.id}</Row>
          <Row label="Data e hora da consulta">{ident.dataHora || (startedAt ? startedAt.toLocaleString('pt-BR') : '')}</Row>
          <Row label="Médico">{MEDICO.nome} · {MEDICO.crm}</Row>
        </section>

        {conflicts.length > 0 && alertAcked && (
          <p className="sh-warn">
            Alerta de segurança: alergia a {conflicts[0].allergen} e prescrição de {conflicts.map((c) => c.med).join(', ')} mantida por decisão do médico.
          </p>
        )}

        <Block title="S — Subjetivo">
          <Row label="Queixa principal">{s.qp}</Row>
          <Row label="História da doença atual (HDA)">{s.hma}</Row>
          <Row label="Histórico pregresso e comorbidades">{s.hist}</Row>
          <Row label="Alergias">{s.alergias}</Row>
          <Row label="Medicamentos em uso">{s.meds}</Row>
          <Row label="Histórico familiar e hábitos">{s.habitos}</Row>
        </Block>

        <Block title="O — Objetivo">
          <Row label="Sinais vitais">{o.sinais}</Row>
          <Row label="Exame físico">{o.exame}</Row>
          <Row label="Exames complementares">{o.comp}</Row>
        </Block>

        <Block title="A — Avaliação">
          <Row label="Hipótese diagnóstica">{a.hip}</Row>
          <Row label="CID-10">
            {cids.length ? cids.map((c) => `${c.code} — ${c.desc}`).join('; ') : 'Nenhum CID confirmado'}
          </Row>
        </Block>

        <Block title="P — Plano terapêutico">
          <Row label="Prescrição">
            {p.rx.length ? p.rx.map((r) => `${r.med} — ${r.pos}`).join(' | ') : 'Sem prescrição medicamentosa nesta consulta'}
          </Row>
          <Row label="Exames solicitados">{p.exames.length ? p.exames.map((e) => e.text).join('; ') : 'Nenhum exame solicitado'}</Row>
          <Row label="Orientações e encaminhamentos">{p.orient}</Row>
        </Block>

        <footer className="sh-foot">
          <div className="sh-sign">
            <span />
            <p>{MEDICO.nome}</p>
            <p>{MEDICO.crm} · {MEDICO.especialidade}</p>
          </div>
          <p className="sh-meta">
            Prontuário elaborado com apoio de IA, revisado e aprovado pelo médico em {draft.homologadoEm}. Assinatura digital #{draft.assinatura}. Registro imutável.
          </p>
        </footer>
      </article>
    </div>
  );
}
