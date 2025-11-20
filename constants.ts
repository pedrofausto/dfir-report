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
        
        /* Improved Timeline CSS */
        .timeline-container { padding: 20px 0; }
        .timeline-item { position: relative; padding-left: 60px; margin-bottom: 30px; }
        .timeline-item::before { content: ''; position: absolute; left: 29px; top: 45px; bottom: -35px; width: 2px; background: var(--border-color); z-index: 0; }
        .timeline-item:last-child::before { display: none; }
        
        .timeline-icon-wrapper {
            position: absolute; left: 0; top: 0; width: 60px; height: 100%; display: flex; flex-direction: column; align-items: center; z-index: 1;
        }
        .timeline-icon {
            width: 40px; height: 40px; border-radius: 50%; background: var(--bg-secondary); border: 2px solid var(--border-color);
            display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 10px; box-shadow: 0 0 0 4px var(--bg-primary);
        }
        .timeline-icon.critical { border-color: var(--critical); color: var(--critical); background: rgba(239, 68, 68, 0.1); }
        .timeline-icon.high { border-color: var(--high); color: var(--high); background: rgba(249, 115, 22, 0.1); }
        .timeline-icon.medium { border-color: var(--warning); color: var(--warning); background: rgba(234, 179, 8, 0.1); }
        
        .timeline-content {
            background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;
            transition: all 0.2s ease; cursor: pointer; position: relative;
        }
        .timeline-content:hover {
            border-color: var(--accent-blue); transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .timeline-content::before {
            content: ''; position: absolute; left: -8px; top: 20px; width: 16px; height: 16px;
            background: var(--bg-secondary); border-left: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);
            transform: rotate(45deg); transition: border-color 0.2s ease;
        }
        .timeline-content:hover::before { border-color: var(--accent-blue); }
        
        .t-header { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
        .t-time { font-family: monospace; color: var(--accent-blue); font-size: 14px; font-weight: 600; }
        .t-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .t-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 0; }
        
        .t-details {
            display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);
            animation: slideDown 0.3s ease-out;
        }
        .t-details.active { display: block; }
        .t-kv { display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 4px; font-size: 13px; }
        .t-key { color: var(--text-muted); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding-top: 2px; }
        .t-val { color: var(--text-primary); font-family: monospace; word-break: break-all; }
        
        .expand-hint { font-size: 11px; color: var(--text-muted); margin-top: 12px; display: flex; align-items: center; gap: 4px; }
        .expand-hint::before { content: 'Click to toggle details'; }
        
        @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
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
            <div class="card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Threat Intelligence: LockBit Gang</h2>
                        <div class="card-subtitle">Perfil do Ator de Ameaça & TTPs</div>
                    </div>
                </div>
                <div style="display: grid; gap: 16px;">
                    <div>
                        <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 8px; font-size: 15px;">Modus Operandi</h3>
                        <p class="summary-text" style="font-size: 14px;">
                            O grupo LockBit opera no modelo RaaS (Ransomware-as-a-Service). Caracteriza-se pela automação agressiva, exploração de credenciais RDP fracas e uso extensivo de ferramentas administrativas (LoLBins) para movimento lateral. A tática de dupla extorsão é padrão, ameaçando vazar dados exfiltrados via RClone caso o resgate não seja pago.
                        </p>
                    </div>
                    <div>
                        <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 8px; font-size: 15px;">TTPs Observados</h3>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="badge badge-warning" style="font-size: 11px;">Initial Access: Phishing</span>
                            <span class="badge badge-critical" style="font-size: 11px;">Lateral Movement: RDP/SMB</span>
                            <span class="badge badge-high" style="font-size: 11px;">Exfiltration: RClone</span>
                            <span class="badge badge-high" style="font-size: 11px;">Impact: Data Encrypted</span>
                        </div>
                    </div>
                    <div>
                        <h3 style="color: var(--text-primary); font-weight: 600; margin-bottom: 8px; font-size: 15px;">Referências Externas</h3>
                        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 13px;">
                            <a href="https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-165a" target="_blank" style="color: var(--medium); text-decoration: none; display: flex; align-items: center; gap: 4px;">
                                <span>🔗</span> CISA Advisory: #StopRansomware: LockBit 3.0
                            </a>
                            <a href="https://attack.mitre.org/groups/G0081/" target="_blank" style="color: var(--medium); text-decoration: none; display: flex; align-items: center; gap: 4px;">
                                <span>🔗</span> MITRE ATT&CK: Group G0081 (LockBit)
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="timeline" class="tab-content">
            <div class="card">
                <div class="card-header">
                    <div>
                        <h2 class="card-title">Timeline Detalhada de Eventos</h2>
                        <div class="card-subtitle">Clique nos eventos para ver detalhes técnicos</div>
                    </div>
                </div>
                <div class="timeline-container" id="timelineContainer"></div>
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
        
        function toggleEvent(id) {
            const details = document.getElementById('details-' + id);
            if (details) {
                details.classList.toggle('active');
            }
        }

        const timelineEvents = [
            { 
                id: 1,
                time: "16 Nov 19:50:26", 
                title: "Recepção de Phishing",
                desc: "Usuário MARKETING01 recebeu e interagiu com email contendo anexo malicioso (JS:Trojan.Cryxos).",
                severity: "medium",
                icon: "📩",
                details: {
                    "Source": "support@redecanais.lc",
                    "Subject": "Nota Fiscal Pendente - Urgente",
                    "Target": "MARKETING01 (10.10.20.45)",
                    "Vector": "HTML Smuggling"
                }
            },
            { 
                id: 2,
                time: "16 Nov 22:30:15", 
                title: "Execução de Payload (C2)",
                desc: "Estabelecimento de conexão de comando e controle (C2) com infraestrutura adversária.",
                severity: "high",
                icon: "🌐",
                details: {
                    "Process": "powershell.exe -enc ...",
                    "Dest IP": "104.18.11.31 (US)",
                    "Port": "443 (HTTPS)",
                    "Status": "ESTABLISHED"
                }
            },
            { 
                id: 3,
                time: "19 Nov 01:50:42", 
                title: "Movimento Lateral (RDP)",
                desc: "Comprometimento de credenciais administrativas e acesso RDP ao Domain Controller.",
                severity: "critical",
                icon: "🔑",
                details: {
                    "Src Host": "MARKETING01",
                    "Dst Host": "SRVVELOXAD01 (10.10.0.2)",
                    "Account": "VELOX\\admin",
                    "Method": "RDP (Port 3389)"
                }
            },
            { 
                id: 4,
                time: "19 Nov 02:12:10", 
                title: "Início de Exfiltração",
                desc: "Execução do binário RClone para upload massivo de dados para nuvem não autorizada.",
                severity: "critical",
                icon: "📤",
                details: {
                    "Tool": "rclone-v1.71.2-windows-386.exe",
                    "Config": "mega-cloud-backup",
                    "Volume": "~450GB Estimated",
                    "Filter": "*.docx, *.xlsx, *.pdf, *.sql"
                }
            },
            { 
                id: 5,
                time: "19 Nov 06:59:59", 
                title: "Evasão de Defesa",
                desc: "Tentativa de desativação do Bitdefender usando ProcessHacker (Masquerading).",
                severity: "high",
                icon: "🛡️",
                details: {
                    "File": "C:\\Windows\\nCNOlHWJ.exe",
                    "Impersonation": "ProcessHacker",
                    "Action": "Service Stop Attempt",
                    "Outcome": "Blocked by Tamper Protection"
                }
            },
            { 
                id: 6,
                time: "19 Nov 08:19:55", 
                title: "Ransomware Detonado",
                desc: "Criptografia em massa iniciada no File Server. Nota de resgate 'Restore-My-Files.txt' criada.",
                severity: "critical",
                icon: "🔒",
                details: {
                    "Target": "SRVVELOXFS01 (10.10.0.4)",
                    "Malware": "LockBit 3.0 Variant",
                    "Extension": ".lockbit",
                    "Impact": "100% File Shares Inaccessible"
                }
            }
        ];

        function renderTimeline() {
            const container = document.getElementById('timelineContainer');
            container.innerHTML = timelineEvents.map(event => {
                const detailHtml = Object.entries(event.details).map(([key, val]) => 
                    \`<div class="t-kv"><div class="t-key">\${key}</div><div class="t-val">\${val}</div></div>\`
                ).join('');

                return \`
                <div class="timeline-item">
                    <div class="timeline-icon-wrapper">
                        <div class="timeline-icon \${event.severity}">\${event.icon}</div>
                    </div>
                    <div class="timeline-content" onclick="toggleEvent(\${event.id})">
                        <div class="t-header">
                            <span class="t-time">\${event.time}</span>
                            <span class="badge badge-\${event.severity}" style="font-size:10px; padding: 2px 8px;">\${event.severity.toUpperCase()}</span>
                        </div>
                        <div class="t-title">\${event.title}</div>
                        <p class="t-desc">\${event.desc}</p>
                        <div class="expand-hint"></div>
                        <div class="t-details" id="details-\${event.id}">
                            \${detailHtml}
                        </div>
                    </div>
                </div>
                \`;
            }).join('');
        }
        document.addEventListener('DOMContentLoaded', renderTimeline);
    </script>
</body>
</html>`;