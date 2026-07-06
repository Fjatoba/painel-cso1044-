/* SOPHIA 2.8 — Painel docente
   Este painel não se conecta diretamente ao Google Sheets (evita expor
   credenciais em uma página estática hospedada publicamente). Em vez disso,
   o docente exporta um JSON do Apps Script (função exportSubmissoesJSON,
   em Code.gs) e cola aqui. Ao abrir, o painel mostra dados de demonstração
   para que a interface nunca fique vazia/quebrada. */

const AUDIT_ITEMS = [
  {status:"good", title:"Interface discente sem gabarito", desc:"A ficha técnica por base (que sugeria variáveis e leituras esperadas) foi substituída por um dicionário de variáveis neutro. A escolha de variáveis e a interpretação são avaliadas, não fornecidas."},
  {status:"good", title:"Upload de outputs implementado", desc:"Output do Jamovi e documento .docx agora são anexados e salvos no Drive (pasta SOPHIA_Outputs), com limite de tamanho e fallback por link para arquivos grandes."},
  {status:"good", title:"Descrição técnica + análise sociológica exigidas", desc:"Cada bloco analítico agora exige dois textos, não um só, e cada página traz um modelo geral de escrita com exemplo fictício (não extraído das bases do curso)."},
  {status:"good", title:"Identidade por nome, sem pontuação", desc:"O nome é cotejado com a aba turma (nunca bloqueia); desde a 2.8, o status de identidade não soma nem subtrai da nota técnica — identificar-se corretamente não é um mérito avaliável."},
  {status:"good", title:"Nota técnica sem CASE — e CASE sinalizador separado", desc:"A nota sugerida usa apenas regras verificáveis. Existe um indicador auxiliar de cobertura de vocabulário (CASE sinalizador), mas ele não entra na nota e não foi calibrado — use só para priorizar revisão."},
  {status:"good", title:"Painel docente com carregamento automático protegido por token", desc:"O endpoint de exportação (doGet?action=export) só responde com o token docente correto, guardado em Script Properties — nunca no código-fonte publicado."},
  {status:"warn", title:"Token é um segredo compartilhado, não uma conta individual", desc:"Qualquer pessoa com o token acessa os dados. Trate-o como uma senha: não cole em chats, print ou repositórios; troque-o se suspeitar de vazamento."},
  {status:"warn", title:"Upload por Apps Script tem limite conservador", desc:"CONFIG.MAX_FILE_MB (padrão 6MB) protege contra timeout, mas arquivos muito grandes ainda dependem do link do Drive como alternativa manual."},
  {status:"warn", title:"Google Sheets como banco de dados", desc:"Adequado para o volume de uma turma. Se o uso escalar para múltiplas turmas simultâneas, reavaliar a infraestrutura."},
  {status:"bad", title:"Nota sugerida exige revisão sempre", desc:"Regras técnicas não substituem julgamento pedagógico, especialmente na leitura da análise sociológica. Homologue manualmente antes de lançar a nota final."}
];

const DEMO_SUBMISSOES = [
  {
    id_submissao:"SOPHIA-2026-D-DEMO-001", base:"Base 1 - Educação, trabalho e desigualdades",
    status_submissao:"recebida", checklist:"15/16", alertas:["p-valor coerente"], nota_tecnica:8.6,
    case_sinalizador:0.82, case_nivel:"boa cobertura de vocabulário",
    integrantes:["Ana Silva (confirmado)","Bruno Lima (confirmado)"],
    arquivos:[{tipo:"output_jamovi",nome:"output_grupo1.pdf",link:"",status:"recebido"},{tipo:"documento_docx",nome:"relatorio_grupo1.docx",link:"",status:"recebido"}],
    feedback:"DEVOLUTIVA TÉCNICO-FORMATIVA — SOPHIA 2.8\n\nSubmissão: SOPHIA-2026-D-DEMO-001\nNota técnica sugerida: 8.6/10\n\nPontos fortes:\n- Boa completude no checklist técnico-formativo.\n- Técnica de associação correta para a base (qui-quadrado).\n\nPontos a revisar:\n- Aprofundar a análise sociológica do odds ratio.\n\nAlertas técnicos:\n- Nenhum alerta crítico identificado.\n\nCASE sinalizador (indicador auxiliar, NÃO integra a nota): 0.82 — boa cobertura de vocabulário.\n\nObservação: devolutiva preliminar, baseada em regras técnicas e checklist."
  },
  {
    id_submissao:"SOPHIA-2026-D-DEMO-002", base:"Base 2 - Universidade, permanência e desempenho",
    status_submissao:"alerta_duplicidade", checklist:"11/16", alertas:["p_medias_contraditorio","causalidade_indevida"], nota_tecnica:5.2,
    case_sinalizador:0.45, case_nivel:"cobertura baixa",
    integrantes:["Carla Souza (alerta_aproximado)","Diego Melo (confirmado)"],
    arquivos:[{tipo:"output_jamovi",nome:"output_grupo2.pdf",link:"",status:"recebido"}],
    feedback:"DEVOLUTIVA TÉCNICO-FORMATIVA — SOPHIA 2.8\n\nSubmissão: SOPHIA-2026-D-DEMO-002\nNota técnica sugerida: 5.2/10\n\nAlertas técnicos:\n- [alto] p < 0,05, mas o texto sugere ausência de significância.\n- [medio] Uso de linguagem causal sem desenho causal.\n\nCASE sinalizador: 0.45 — cobertura baixa. Priorize a revisão desta entrega.\n\nAtenção: documento .docx não foi anexado — apenas o output do Jamovi.\n\nObservação: revisar com a dupla antes de homologar."
  },
  {
    id_submissao:"SOPHIA-2026-I-DEMO-003", base:"Base 3 - Atitudes, percepções e políticas públicas",
    status_submissao:"alerta_identidade_nao_confirmada", checklist:"6/16", alertas:["checklist_incompleto"], nota_tecnica:3.1,
    case_sinalizador:0.10, case_nivel:"cobertura muito baixa",
    integrantes:["Estudante Exemplo (nao_encontrado)"],
    arquivos:[],
    feedback:"DEVOLUTIVA TÉCNICO-FORMATIVA — SOPHIA 2.8\n\nSubmissão: SOPHIA-2026-I-DEMO-003\nNota técnica sugerida: 3.1/10\n\nIdentidade — a confirmar pelo docente:\n- \"Estudante Exemplo\": não localizado na lista de turma. A submissão foi aceita normalmente; confirme manualmente.\n\nObservação: nenhum status de identidade bloqueia a submissão — a nota reduzida aqui reflete principalmente o checklist incompleto e a ausência de anexos, não a falha de identidade."
  }
];

let CURRENT_DATA = DEMO_SUBMISSOES;
let CURRENT_FILTER = "todos";

function renderAudit(){
  const wrap = document.getElementById("auditWrap");
  wrap.innerHTML = AUDIT_ITEMS.map(item => `
    <div class="audit-item ${item.status}">
      <div class="audit-icon">${item.status==="good"?"✓":item.status==="warn"?"!":"×"}</div>
      <div><h3>${item.title}</h3><p>${item.desc}</p></div>
      <span class="score-pill">${item.status==="good"?"OK":item.status==="warn"?"Atenção":"Revisar"}</span>
    </div>`).join("");
}

function renderKpis(data){
  const total = data.length;
  const validas = data.filter(d=>d.status_submissao==="recebida").length;
  const alertas = data.filter(d=>d.status_submissao!=="recebida").length;
  const media = total ? (data.reduce((s,d)=>s+Number(d.nota_tecnica||0),0)/total).toFixed(1) : "-";
  const caseMedio = total ? (data.reduce((s,d)=>s+Number(d.case_sinalizador||0),0)/total).toFixed(2) : "-";
  const wrap = document.getElementById("kpiWrap");
  wrap.innerHTML = `
    <div class="kpi-card"><span>Total de submissões</span><strong>${total}</strong><small>carregadas no painel</small></div>
    <div class="kpi-card"><span>Válidas</span><strong>${validas}</strong><small>sem alerta de identidade</small></div>
    <div class="kpi-card"><span>Com alerta</span><strong>${alertas}</strong><small>requerem revisão</small></div>
    <div class="kpi-card"><span>Nota técnica média</span><strong>${media}</strong><small>sugerida, não homologada</small></div>
    <div class="kpi-card"><span>CASE sinalizador médio</span><strong>${caseMedio}</strong><small>auxiliar — não é nota</small></div>`;
}

function statusPill(status){
  if(status==="recebida") return `<span class="pill okp">recebida</span>`;
  if(status==="bloqueada") return `<span class="pill dangerp">bloqueada</span>`;
  return `<span class="pill warnp">${status}</span>`;
}

function renderTable(data){
  const tbody = document.getElementById("submissoesBody");
  const filtered = data.filter(d => {
    if(CURRENT_FILTER==="todos") return true;
    if(CURRENT_FILTER==="validas") return d.status_submissao==="recebida";
    if(CURRENT_FILTER==="alertas") return d.status_submissao!=="recebida";
    return d.base===CURRENT_FILTER || d.base.indexOf(CURRENT_FILTER)===0;
  });
  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td>${d.id_submissao}</td>
      <td>${d.base.replace(/^Base \d - /,"")}</td>
      <td>${statusPill(d.status_submissao)}</td>
      <td>${(d.integrantes||[]).join("<br>")}</td>
      <td>${d.checklist}</td>
      <td>${(d.alertas||[]).length ? d.alertas.join(", ") : "—"}</td>
      <td>${d.nota_tecnica}/10</td>
      <td><span class="pill">${d.case_sinalizador!=null?d.case_sinalizador:"—"}</span></td>
      <td><button class="light" onclick="openDetail('${d.id_submissao}')">Ver</button></td>
    </tr>`).join("") || `<tr><td colspan="9">Nenhuma submissão encontrada para este filtro.</td></tr>`;
}

function renderArquivosDetalhe(arquivos){
  const lista = arquivos || [];
  const temOutput = lista.some(a=>a.tipo==="output_jamovi");
  const temDocx = lista.some(a=>a.tipo==="documento_docx");
  const linhas = lista.length
    ? lista.map(a=>{
        const rotulo = a.tipo==="output_jamovi"?"Output do Jamovi":"Documento .docx";
        let item;
        if(a.link) item = `<a href="${a.link}" target="_blank">${a.nome}</a>`;
        else if(a.status==="rejeitado_tamanho") item = `${a.nome} <em>(rejeitado: acima do limite de tamanho)</em>`;
        else if(a.status==="erro_ao_salvar") item = `${a.nome} <em>(erro ao salvar no Drive — verificar logs)</em>`;
        else item = `${a.nome} <em>(sem link — dado de demonstração)</em>`;
        return `<li>${rotulo}: ${item} (${a.status})</li>`;
      }).join("")
    : "<li>Nenhum arquivo anexado.</li>";
  const aviso = (!temOutput || !temDocx) ? `<p class="help" style="color:#b23b3b">⚠️ Faltando: ${!temOutput?"output do Jamovi":""}${(!temOutput&&!temDocx)?" e ":""}${!temDocx?"documento .docx":""} — confira se há link do Drive alternativo na aba respostas.</p>` : "";
  return `<ul>${linhas}</ul>${aviso}`;
}

function openDetail(id){
  const d = CURRENT_DATA.find(x=>x.id_submissao===id);
  if(!d) return;
  document.getElementById("modalTitle").textContent = d.id_submissao;
  document.getElementById("modalBody").innerHTML = `
    <p><strong>Base:</strong> ${d.base}</p>
    <p><strong>Status:</strong> ${statusPill(d.status_submissao)}</p>
    <p><strong>Integrantes:</strong> ${(d.integrantes||[]).join(", ")}</p>
    <p><strong>Checklist:</strong> ${d.checklist}</p>
    <p><strong>Arquivos anexados:</strong></p>
    ${renderArquivosDetalhe(d.arquivos)}
    <p><strong>Nota técnica sugerida:</strong> ${d.nota_tecnica}/10</p>
    <p><strong>CASE sinalizador (auxiliar, não é nota):</strong> ${d.case_sinalizador!=null?d.case_sinalizador:"—"} ${d.case_nivel?"— "+d.case_nivel:""}</p>
    <pre class="feedback-box">${d.feedback||""}</pre>`;
  document.getElementById("feedbackPreview").textContent = d.feedback || "";
  document.getElementById("detailModal").classList.add("open");
}
function closeDetail(){ document.getElementById("detailModal").classList.remove("open"); }

function renderAll(data){
  CURRENT_DATA = data;
  renderKpis(data);
  renderTable(data);
  if(data[0]) document.getElementById("feedbackPreview").textContent = data[0].feedback || "";
}

document.addEventListener("DOMContentLoaded", () => {
  renderAudit();
  renderAll(DEMO_SUBMISSOES);

  document.querySelectorAll(".tab-btn[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn[data-filter]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      CURRENT_FILTER = btn.dataset.filter;
      renderTable(CURRENT_DATA);
    });
  });

  document.getElementById("btnCarregar").addEventListener("click", () => {
    const raw = document.getElementById("jsonInput").value.trim();
    if(!raw) return;
    try{
      const parsed = JSON.parse(raw);
      renderAll(Array.isArray(parsed) ? parsed : [parsed]);
    }catch(e){ alert("JSON inválido. Confira o formato exportado pelo Apps Script."); }
  });
  document.getElementById("btnDemo").addEventListener("click", () => {
    document.getElementById("jsonInput").value = "";
    renderAll(DEMO_SUBMISSOES);
  });

  // Opção A — carregamento automático via endpoint protegido por token.
  // A URL do Web App NÃO é segredo (já está pública no repositório discente,
  // em assets/flow-core.js) — por isso vem pré-preenchida aqui, para não
  // precisar colar toda vez. O TOKEN é o segredo de verdade: por padrão
  // fica só em sessionStorage (some ao fechar a aba); se a caixa "lembrar
  // neste navegador" for marcada, passa a ficar em localStorage (persiste
  // entre sessões, só neste computador/navegador — não marque em
  // computador compartilhado ou público).
  const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzRYqsYnId4-vUJT6QPo7gqgX_8U6GCIvCuEzBx4FspaCuHwHD8WR8ikYAF8XJ28Xf7/exec";
  const urlField = document.getElementById("webAppUrl");
  const tokenField = document.getElementById("docenteToken");
  const lembrarField = document.getElementById("lembrarToken");
  urlField.value = sessionStorage.getItem("sophia_webapp_url") || localStorage.getItem("sophia_webapp_url") || DEFAULT_WEB_APP_URL;
  const tokenSalvo = localStorage.getItem("sophia_docente_token") || sessionStorage.getItem("sophia_docente_token") || "";
  tokenField.value = tokenSalvo;
  if(lembrarField) lembrarField.checked = !!localStorage.getItem("sophia_docente_token");

  document.getElementById("btnFetch").addEventListener("click", async () => {
    const url = urlField.value.trim();
    const token = tokenField.value.trim();
    const msg = document.getElementById("fetchMsg");
    if(!url || !token){ msg.textContent = "Preencha a URL do Web App e o token docente."; return; }
    if(lembrarField && lembrarField.checked){
      localStorage.setItem("sophia_webapp_url", url);
      localStorage.setItem("sophia_docente_token", token);
      sessionStorage.removeItem("sophia_webapp_url"); sessionStorage.removeItem("sophia_docente_token");
    } else {
      sessionStorage.setItem("sophia_webapp_url", url);
      sessionStorage.setItem("sophia_docente_token", token);
      localStorage.removeItem("sophia_webapp_url"); localStorage.removeItem("sophia_docente_token");
    }
    msg.textContent = "Carregando...";
    try{
      const res = await fetch(`${url}?action=export&token=${encodeURIComponent(token)}`);
      const parsed = await res.json();
      if(!parsed.ok) throw new Error(parsed.error || "Falha ao carregar dados.");
      renderAll(parsed.data || []);
      msg.textContent = `Carregado: ${(parsed.data||[]).length} submissões.`;
    }catch(err){
      msg.textContent = "Erro ao carregar: " + err.message + " (confira URL, token, e se setDocenteToken() foi executado no Apps Script).";
    }
  });
});
