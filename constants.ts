import { User, UserRole } from "./types";

export const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'admin', // password: admin
    role: UserRole.ADMIN,
    avatarUrl: 'https://picsum.photos/id/1/200/200'
  },
  {
    id: '2',
    username: 'analyst', // password: analyst
    role: UserRole.ANALYST,
    avatarUrl: 'https://picsum.photos/id/2/200/200'
  },
  {
    id: '3',
    username: 'viewer', // password: viewer
    role: UserRole.VIEWER,
    avatarUrl: 'https://picsum.photos/id/3/200/200'
  }
];

export const INITIAL_REPORT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório DFIR - Incidente #3167 | Ataque Ransomware LockBit</title>
    <style>
        :root {
            --bg-primary: #0f1419;
            --bg-secondary: #1a1f2e;
            --bg-card: #232936;
            --bg-card-hover: #2a3142;
            --text-primary: #e4e6eb;
            --text-secondary: #a8b3cf;
            --text-muted: #6b7280;
            --border-color: #2d3748;
            --critical: #ef4444;
            --high: #f97316;
            --warning: #eab308;
            --medium: #3b82f6;
            --low: #10b981;
            --info: #06b6d4;
            --accent-blue: #3b82f6;
            --accent-purple: #8b5cf6;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: var(--bg-primary); color: var(--text-primary); line-height: 1.6; overflow-x: hidden; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, var(--bg-secondary) 0%, #1e2738 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
        .header-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
        .header-title h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
        .header-meta { display: flex; gap: 20px; flex-wrap: wrap; color: var(--text-secondary); font-size: 14px; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-critical { background: rgba(239, 68, 68, 0.15); color: var(--critical); border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge-high { background: rgba(249, 115, 22, 0.15); color: var(--high); border: 1px solid rgba(249, 115, 22, 0.3); }
        .badge-warning { background: rgba(234, 179, 8, 0.15); color: var(--warning); border: 1px solid rgba(234, 179, 8, 0.3); }
        .badge-info { background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); border: 1px solid rgba(59, 130, 246, 0.3); }
        .quick-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: var(--bg-card); padding: 24px; border-radius: 10px; border: 1px solid var(--border-color); transition: all 0.3s ease; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent-blue); transition: width 0.3s ease; }
        .stat-card.critical::before { background: var(--critical); }
        .stat-label { font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .stat-value { font-size: 32px; font-weight: 700; color: var(--text-primary); }
        .tab-nav { display: flex; gap: 4px; background: var(--bg-secondary); padding: 6px; border-radius: 10px; margin-bottom: 30px; border: 1px solid var(--border-color); overflow-x: auto; flex-wrap: wrap; }
        .tab-btn { padding: 12px 24px; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; border-radius: 8px; font-size: 14px; font-weight: 500; transition: all 0.3s ease; white-space: nowrap; }
        .tab-btn:hover { background: var(--bg-card); color: var(--text-primary); }
        .tab-btn.active { background: var(--accent-blue); color: white; font-weight: 600; }
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 24px; margin-bottom: 24px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color); }
        .card-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
        .card-subtitle { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }
        .timeline { position: relative; padding: 20px 0; }
        .timeline-phase { margin-bottom: 30px; padding-left: 40px; position: relative; }
        .timeline-phase::before { content: ''; position: absolute; left: 12px; top: 12px; bottom: -30px; width: 2px; background: var(--border-color); }
        .timeline-phase:last-child::before { display: none; }
        .timeline-marker { position: absolute; left: 0; top: 8px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg-secondary); border: 3px solid var(--high); cursor: pointer; transition: all 0.3s ease; }
        .timeline-marker.critical { border-color: var(--critical); }
        .timeline-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 12px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 12px; transition: all 0.3s ease; }
        .timeline-name { font-size: 18px; font-weight: 600; color: var(--text-primary); }
        .timeline-date { font-size: 14px; color: var(--text-secondary); }
        .timeline-events { display: none; margin-top: 12px; padding-left: 16px; }
        .timeline-events.expanded { display: block; }
        .timeline-event { padding: 12px; background: rgba(59, 130, 246, 0.05); border-left: 3px solid var(--accent-blue); margin-bottom: 10px; border-radius: 6px; }
        .event-time { font-size: 12px; color: var(--info); font-weight: 600; margin-bottom: 4px; }
        .event-description { font-size: 14px; color: var(--text-primary); margin-bottom: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-top">
                <div class="header-title">
                    <h1>RELATÓRIO DE ANÁLISE FORENSE - INCIDENTE #3167</h1>
                    <div class="header-meta"><span>📅 16-19 Novembro 2025</span><span>🏢 ProAuto/Velox</span></div>
                </div>
                <div><span class="badge badge-critical">CRÍTICO - Ransomware com Dupla Extorsão</span></div>
            </div>
        </div>
        <div class="quick-stats">
            <div class="stat-card critical"><div class="stat-label">Severidade</div><div class="stat-value">Crítica</div></div>
            <div class="stat-card critical"><div class="stat-label">Servidores Afetados</div><div class="stat-value">3</div></div>
        </div>
        <div class="tab-nav">
            <button class="tab-btn active" onclick="switchTab('overview')">Resumo Executivo</button>
            <button class="tab-btn" onclick="switchTab('timeline')">Timeline</button>
        </div>
        <div id="overview" class="tab-content active">
            <div class="card">
                <div class="card-header"><div><h2 class="card-title">Resumo Executivo</h2></div></div>
                <div class="summary-text">
                    Entre 16-19 de novembro de 2025, a infraestrutura da ProAuto/Velox sofreu um ataque crítico de ransomware atribuído ao <strong>LockBit Gang (72% de confiança)</strong>. O ataque iniciou via phishing com JS:Trojan.Cryxos, progredindo para movimento lateral e exfiltração de dados usando RClone ao longo de <strong>72 horas não detectadas</strong>.
                </div>
            </div>
        </div>
        <div id="timeline" class="tab-content">
            <div class="card">
                <div class="card-header"><div><h2 class="card-title">Timeline Detalhada</h2></div></div>
                <div class="timeline" id="timelineContainer"></div>
            </div>
        </div>
    </div>
    <script>
        function switchTab(tabName) {
            const tabs = document.querySelectorAll('.tab-content');
            const buttons = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => tab.classList.remove('active'));
            buttons.forEach(btn => btn.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }
        const timelineData = [
            { name: "Fase 1: Acesso Inicial", date: "16 Nov", severity: "high", events: [{ time: "19:50", description: "Phishing detectado", details: "Trojan Cryxos" }] },
            { name: "Fase 4: Ransomware", date: "19 Nov", severity: "critical", events: [{ time: "08:19", description: "Criptografia em massa", details: "Todos servidores afetados" }] }
        ];
        function renderTimeline() {
            const container = document.getElementById('timelineContainer');
            container.innerHTML = timelineData.map((phase, index) => \`
                <div class="timeline-phase">
                    <div class="timeline-marker \${phase.severity}" onclick="document.getElementById('phase-\${index}').style.display = document.getElementById('phase-\${index}').style.display === 'block' ? 'none' : 'block'"></div>
                    <div class="timeline-header">
                        <div class="timeline-name">\${phase.name}</div>
                        <span class="badge badge-\${phase.severity}">\${phase.severity}</span>
                    </div>
                    <div class="timeline-events expanded" id="phase-\${index}">
                        \${phase.events.map(e => \`<div class="timeline-event"><div class="event-time">\${e.time}</div><div class="event-description">\${e.description}</div></div>\`).join('')}
                    </div>
                </div>
            \`).join('');
        }
        document.addEventListener('DOMContentLoaded', renderTimeline);
    </script>
</body>
</html>`;
