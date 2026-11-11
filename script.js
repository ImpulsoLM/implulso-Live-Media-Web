// ============================================================================
    // CONFIGURACIÓN OFICIAL DE LEAD AUTOMATOR (META MARKETING API & WEBHOOK)
    // ============================================================================
    const LEAD_AUTOMATOR_CONFIG = {
      appName: "Lead Automator",
      metaAppId: "1124959389975591",
      businessPortfolio: "Crecemos con Marketing",
      officialWhatsApp: "525667442715",
      slaMaxSeconds: 15,
      // PASO PARA ACTIVAR WEBHOOK EN SERVIDOR / MAKE / N8N:
      // 1. Pega aquí la URL de tu Webhook receptor (ej. Make, n8n o tu endpoint Node/Python)
      // 2. Cambia enableLiveWebhook a true
      webhookUrl: "https://tu-endpoint-lead-automator.com/webhook/impulso-live-media",
      enableLiveWebhook: false
    };

    const OFFICIAL_WA = LEAD_AUTOMATOR_CONFIG.officialWhatsApp;

    let dispatchCounter = 0;

    function saveWebhookFromUI() {
      const inp = document.getElementById('live-webhook-input');
      const pill = document.getElementById('automator-status-pill');
      if (inp && inp.value.trim()) {
        LEAD_AUTOMATOR_CONFIG.webhookUrl = inp.value.trim();
        LEAD_AUTOMATOR_CONFIG.enableLiveWebhook = !inp.value.includes('tu-endpoint-lead-automator.com');
        if (pill) {
          pill.textContent = LEAD_AUTOMATOR_CONFIG.enableLiveWebhook
            ? '🟢 Webhook en Vivo Activo: ' + LEAD_AUTOMATOR_CONFIG.webhookUrl
            : '● Endpoint actualizado en modo Simulación Local';
        }
      }
    }

    function copyJsonMonitor(btnEl) {
      const monitor = document.getElementById('automator-json-monitor');
      if (monitor) {
        copySummaryText(monitor.textContent, btnEl);
      }
    }

    // Motor central que procesa cada prospecto de la web hacia Lead Automator
    async function dispatchToLeadAutomator(leadData, options) {
      dispatchCounter++;
      const opts = options || {};
      const latencyMs = Math.floor(95 + Math.random() * 65);
      const eventId = "evt_ilm_" + Date.now().toString(36) + "_" + dispatchCounter;

      const payload = {
        event_id: eventId,
        dispatch_number: dispatchCounter,
        http_method: "POST",
        webhook_endpoint: LEAD_AUTOMATOR_CONFIG.webhookUrl,
        app_name: LEAD_AUTOMATOR_CONFIG.appName,
        meta_app_id: LEAD_AUTOMATOR_CONFIG.metaAppId,
        portfolio: LEAD_AUTOMATOR_CONFIG.businessPortfolio,
        timestamp_iso: new Date().toISOString(),
        sla_target_seconds: LEAD_AUTOMATOR_CONFIG.slaMaxSeconds,
        agency_whatsapp: OFFICIAL_WA,
        lead: leadData
      };

      // 1. Actualizar el monitor visual de JSON en la página
      const monitor = document.getElementById('automator-json-monitor');
      const pill = document.getElementById('automator-status-pill');
      const waPreview = document.getElementById('automator-wa-preview');
      const waApiPreview = document.getElementById('automator-wa-api-preview');
      const waLiveLink = document.getElementById('automator-wa-live-link');

      if (monitor) {
        monitor.textContent = JSON.stringify(payload, null, 2);
        monitor.style.borderColor = '#10b981';
        setTimeout(() => { monitor.style.borderColor = 'rgba(255,255,255,0.09)'; }, 900);
      }
      if (pill) {
        pill.textContent = LEAD_AUTOMATOR_CONFIG.enableLiveWebhook ? 'Enviando al webhook…' : 'DEMO · Ejemplo #' + dispatchCounter + ' · Sin envío real';
      }

      // Construir vista previa de WhatsApp Cloud API según el tipo de lead
      const leadName = leadData.nombre || 'Prospecto';
      const leadPhone = leadData.whatsapp_prospecto || leadData.whatsapp || '524431234567';
      const templateName = leadData.plantilla_codigo || (leadData.tiktok_user ? 'impulso_roster_streamer_v1' : 'impulso_b2b_sla15_qr_v1');
      const waMsgText = leadData.mensaje_whatsapp_generado ||
        `¡Hola, ${leadName}! Recibimos tu solicitud en Impulso Live Media (${leadData.empresa || leadData.tiktok_user || leadData.sector || 'Diagnóstico'}). Tu calificación es ${leadData.score_asignado || leadData.score_calculado || 'SCORE A'} y aquí tienes tu acceso prioritario.`;

      if (waPreview) {
        const header = document.createElement('div');
        header.className = 'whatsapp-header';
        header.textContent = 'Vista previa de WhatsApp → ' + leadPhone + ' · Sin confirmación de entrega';
        const body = document.createElement('div');
        body.className = 'whatsapp-body';
        body.textContent = waMsgText;
        waPreview.replaceChildren(header, body);
      }

      if (waApiPreview) {
        const cloudApiObj = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: leadPhone,
          type: "template",
          template: {
            name: templateName,
            language: { code: "es_MX" },
            components: [
              { type: "body", parameters: [{ type: "text", text: leadName }, { type: "text", text: leadData.score_asignado || leadData.score_calculado || "SCORE A" }] }
            ]
          }
        };
        waApiPreview.textContent = JSON.stringify(cloudApiObj, null, 2);
      }

      if (waLiveLink) {
        const waTestText = encodeURIComponent(
          `⚡ [PRUEBA LEAD AUTOMATOR #${dispatchCounter}] App ID: ${LEAD_AUTOMATOR_CONFIG.metaAppId}
` +
          `• Evento: ${eventId}
` +
          `• Prospecto: ${leadName} (${leadData.empresa || leadData.tiktok_user || 'Demo'})
` +
          `• Score / Ruta: ${leadData.score_asignado || leadData.score_calculado || leadData.ruta_asignada || 'SCORE A'}
` +
          `• Mensaje disparado: ${waMsgText}`
        );
        waLiveLink.href = `https://wa.me/${OFFICIAL_WA}?text=${waTestText}`;
      }

      // 2. Guardar respaldo local seguro
      try {
        const history = JSON.parse(localStorage.getItem('impulso_leads_log') || '[]');
        history.unshift(payload);
        localStorage.setItem('impulso_leads_log', JSON.stringify(history.slice(0, 20)));
      } catch (err) {
        // Ignorar en modo sandbox estricto
      }

      // 3. Si enableLiveWebhook está activo, dispara el POST real hacia tu Webhook
      if (LEAD_AUTOMATOR_CONFIG.enableLiveWebhook && LEAD_AUTOMATOR_CONFIG.webhookUrl.startsWith('http')) {
        try {
          const response = await fetch(LEAD_AUTOMATOR_CONFIG.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (pill) pill.textContent = response.ok ? 'Webhook recibido · HTTP ' + response.status + ' · No confirma entrega en WhatsApp' : 'Error del webhook · HTTP ' + response.status;
        } catch (networkErr) {
          if (pill) pill.textContent = "No se pudo conectar al webhook. Continúa por WhatsApp.";
        }
      }

      if (opts.scrollToMonitor) {
        const sec = document.getElementById('lead-automator-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return payload;
    }

    // Botones de prueba de los 3 escenarios en el panel técnico Lead Automator
    function testLeadAutomatorPayload(scenario) {
      const mode = scenario || 'inmobiliario';
      if (mode === 'clinica') {
        dispatchToLeadAutomator({
          origen: "Simulador Consola Lead Automator (Escenario 2)",
          division: "B2B Clínica de Alta Especialidad / E-commerce",
          nombre: "Dra. Iris Girón",
          empresa: "Ágata Estética Dental Altozano",
          ciudad: "Morelia, Michoacán",
          whatsapp_prospecto: "524433307681",
          paquete_interes: "Plan 2: Impulso Growth 360° ($14,500 MXN/mes)",
          pre_filtro: "Campaña Diseño de Sonrisa + Bot de Citas con Pase QR",
          score_asignado: "SCORE A (Cita de Diagnóstico Hoy)",
          plantilla_codigo: "impulso_clinica_qr_v1",
          mensaje_whatsapp_generado: "¡Hola, Dra. Iris Girón! Recibimos el registro de Ágata Estética Dental Altozano en menos de 15 segundos. Ya generamos tu proyección de pacientes calificados y tu Pase QR de confirmación."
        }, { scrollToMonitor: false });
      } else if (mode === 'streamer') {
        dispatchToLeadAutomator({
          origen: "Simulador Consola Lead Automator (Escenario 3)",
          division: "TikTok LIVE Creator Network (0% Comisión)",
          nombre: "Sofía Torres",
          tiktok_user: "@sofia.morelia.live",
          ciudad: "Morelia, Michoacán",
          whatsapp_prospecto: "524439876543",
          rango_seguidores: "1,000 a 10,000 (LIVE Activo)",
          interes: "Batallas PK + Scaled LIVE Rewards (~53%) + Campañas UGC",
          score_asignado: "ROSTER OFICIAL APROBADO (/streamer)",
          plantilla_codigo: "impulso_streamer_onboarding_v1",
          mensaje_whatsapp_generado: "🔥 ¡Hola, Sofía (@sofia.morelia.live)! Tu perfil fue pre-aprobado en Impulso Live Media Creator Network con 0% comisión sobre tus Diamantes. Envíanos tu código de TikTok Studio para mandarte la invitación oficial."
        }, { scrollToMonitor: false });
      } else {
        dispatchToLeadAutomator({
          origen: "Simulador Consola Lead Automator (Escenario 1)",
          division: "B2B Desarrolladora Inmobiliaria / Alto Ticket",
          nombre: "Ing. Carlos Méndez",
          empresa: "Hogares DEESA — Altalia Residencial Morelia",
          ciudad: "Morelia, Michoacán",
          whatsapp_prospecto: "524432226608",
          paquete_interes: "Sprint 10 Días ($4,900 MXN) + Plan Growth 360°",
          pre_filtro: "Crédito Bancario Autorizado / Contado (Plazo <30 días)",
          score_asignado: "SCORE A (Asignar a Cerrador Senior en <5 min)",
          plantilla_codigo: "impulso_inmobiliario_qr_v1",
          mensaje_whatsapp_generado: "¡Hola, Ing. Carlos Méndez! Recibimos tu solicitud para Altalia Residencial con Crédito Bancario Autorizado (<30 días). Aquí tienes el recorrido en 4K de 40s y tu Pase QR VIP de acceso preferencial en caseta."
        }, { scrollToMonitor: false });
      }
    }

    // Inicializar consola con el Disparo #1 al cargar la página
    window.addEventListener('DOMContentLoaded', () => {
      testLeadAutomatorPayload('inmobiliario');
    });

    // Navegación suave y menú móvil
    function scrollToSection(id) {
      revealAnchor('#' + id);
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }

    function setMobileNavOpen(open) {
      const drawer = document.getElementById('mobile-nav-drawer');
      const toggle = document.getElementById('mobile-nav-toggle');
      if (!drawer || !toggle) return;
      drawer.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
      toggle.textContent = open ? '✕ Cerrar' : '☰ Menú';
    }

    function toggleMobileNav() {
      const drawer = document.getElementById('mobile-nav-drawer');
      setMobileNavOpen(!drawer?.classList.contains('open'));
    }

    function closeMobileNav() { setMobileNavOpen(false); }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('mobile-nav-drawer')?.classList.contains('open')) {
        closeMobileNav();
        document.getElementById('mobile-nav-toggle')?.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && !event.target.closest('.site-header')) closeMobileNav();
    });
    const desktopNavQuery = window.matchMedia('(min-width: 1201px)');
    desktopNavQuery.addEventListener('change', (event) => {
      if (event.matches) closeMobileNav();
    });

    // 1. Filtro integral de vista por audiencia (Todo / Solo Empresas / Solo Creadores)
    function setSiteMode(mode, btn) {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');

      const b2bBlocks = document.querySelectorAll('.b2b-only-block');
      const creatorBlocks = document.querySelectorAll('.creator-only-block');
      const heroCards = document.getElementById('hero-dual-cards');
      const formsGrid = document.getElementById('forms-grid-container');
      const faqGrid = document.getElementById('faq-grid-container');

      if (mode === 'all') {
        b2bBlocks.forEach(el => el.style.display = '');
        creatorBlocks.forEach(el => el.style.display = '');
        if (heroCards) heroCards.classList.remove('single-mode');
        if (formsGrid) formsGrid.classList.remove('single-mode');
        if (faqGrid) faqGrid.classList.remove('single-mode');
      } else if (mode === 'b2b') {
        b2bBlocks.forEach(el => el.style.display = '');
        creatorBlocks.forEach(el => el.style.display = 'none');
        if (heroCards) heroCards.classList.add('single-mode');
        if (formsGrid) formsGrid.classList.add('single-mode');
        if (faqGrid) faqGrid.classList.add('single-mode');
        switchPhoneSim('b2b', document.getElementById('tab-btn-b2b'));
      } else if (mode === 'creator') {
        b2bBlocks.forEach(el => el.style.display = 'none');
        creatorBlocks.forEach(el => el.style.display = '');
        if (heroCards) heroCards.classList.add('single-mode');
        if (formsGrid) formsGrid.classList.add('single-mode');
        if (faqGrid) faqGrid.classList.add('single-mode');
        switchPhoneSim('live', document.getElementById('tab-btn-live'));
      }
    }

    // 2. Simulador de Teléfono en Hero (B2B vs Sala LIVE PK con reloj en vivo)
    let pkCountdownInterval = null;
    let pkSecondsRemaining = 165; // 02:45

    function formatPKTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s) + ' restantes';
    }

    function startPKTimer() {
      if (pkCountdownInterval) clearInterval(pkCountdownInterval);
      pkCountdownInterval = setInterval(() => {
        if (pkSecondsRemaining > 0) {
          pkSecondsRemaining--;
        } else {
          pkSecondsRemaining = 165;
        }
        const lbl = document.getElementById('pk-timer-label');
        if (lbl) lbl.textContent = formatPKTime(pkSecondsRemaining);
      }, 1000);
    }

    function switchPhoneSim(tab, btn) {
      document.querySelectorAll('.phone-tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.getElementById('phone-sim-b2b').style.display = (tab === 'b2b') ? 'flex' : 'none';
      document.getElementById('phone-sim-live').style.display = (tab === 'live') ? 'flex' : 'none';
      if (tab === 'live') {
        startPKTimer();
      } else if (pkCountdownInterval) {
        clearInterval(pkCountdownInterval);
      }
    }

    // 3. Simulador Interactivo de Batalla PK y Power-Ups
    let redScore = 4420;
    let blueScore = 3890;

    function simulateGift(type) {
      const feed = document.getElementById('pk-event-feed');
      if (type === 'lion') {
        redScore += 500;
        feed.innerHTML = '<div style="color:#34d399; font-weight:800;">🦁 ¡León enviado al Team Impulso (+500 pts)!</div><div style="color:var(--text-secondary); margin-top:4px;">El host agradece en &lt;3 segundos y activa dinámica con la sala.</div>';
      } else if (type === 'glove') {
        redScore += 1250;
        feed.innerHTML = '<div style="color:#ff4d84; font-weight:800;">🥊 ¡COMBO x5 CON BOOSTING GLOVE (+1,250 pts)!</div><div style="color:var(--text-secondary); margin-top:4px;">¡Remontada estratégica en los últimos 30 segundos de batalla!</div>';
      } else if (type === 'time') {
        pkSecondsRemaining += 10;
        const lbl = document.getElementById('pk-timer-label');
        if (lbl) lbl.textContent = formatPKTime(pkSecondsRemaining);
        feed.innerHTML = '<div style="color:var(--accent-cyan); font-weight:800;">⏱️ ¡TIME MAKER ACTIVADO (+10 Segundos Extra)!</div><div style="color:var(--text-secondary); margin-top:4px;">Tiempo extendido para cerrar la misión de liga.</div>';
      } else if (type === 'reset') {
        redScore = 4420;
        blueScore = 3890;
        pkSecondsRemaining = 165;
        const lbl = document.getElementById('pk-timer-label');
        if (lbl) lbl.textContent = formatPKTime(pkSecondsRemaining);
        feed.innerHTML = '<div style="color:#ff85ad; font-weight:700;">🥊 Marcador reiniciado · Batalla PK Oficial</div><div style="color:var(--text-secondary); margin-top:4px;">Usa los botones de abajo para simular regalos y Power-ups.</div>';
      }
      document.getElementById('pk-red-score').textContent = redScore.toLocaleString();
      document.getElementById('pk-blue-score').textContent = blueScore.toLocaleString();
      const pct = Math.min(84, Math.max(22, Math.round((redScore / (redScore + blueScore)) * 100)));
      document.getElementById('pk-red-bar').style.width = pct + '%';
    }

    // 4. Pestañas de Sector B2B
    function switchSectorTab(sector, btn) {
      document.querySelectorAll('.sector-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.getElementById('sector-inmobiliario').classList.toggle('active', sector === 'inmobiliario');
      document.getElementById('sector-ecommerce').classList.toggle('active', sector === 'ecommerce');
    }

    // 5. Reto de los 15 Segundos (Simulador SLA + Pipeline Lead Automator)
    let simInterval = null;
    function setPipelineStep(stepNum) {
      for (let i = 1; i <= 4; i++) {
        const el = document.getElementById('pipe-' + i);
        if (el) {
          el.classList.toggle('done', i <= stepNum);
        }
      }
    }

    function run15SecChallenge() {
      if (simInterval) clearInterval(simInterval);
      const triggerBtn = document.getElementById('sim-trigger-btn');
      const name = document.getElementById('sim-name').value.trim() || 'Prospecto';
      const sector = document.getElementById('sim-sector').value;
      const filter = document.getElementById('sim-filter').value;
      const timerEl = document.getElementById('sim-timer');
      const statusBadge = document.getElementById('sim-status-badge');
      const outputEl = document.getElementById('sim-output');

      if (triggerBtn) triggerBtn.disabled = true;
      setPipelineStep(1);

      let elapsed = 0;
      statusBadge.textContent = 'PROCESANDO EN LEAD AUTOMATOR...';
      statusBadge.style.color = '#f59e0b';
      outputEl.innerHTML = '⏳ <strong>Paso 1/4:</strong> Recibiendo formulario nativo con pre-filtro (<em>' + filter + '</em>)...';

      simInterval = setInterval(() => {
        elapsed += 0.2;
        const formatted = elapsed < 10 ? '0' + elapsed.toFixed(1) : elapsed.toFixed(1);
        timerEl.textContent = '00:' + formatted + 's';

        if (elapsed >= 1.2 && elapsed < 2.4) {
          setPipelineStep(2);
          outputEl.innerHTML = '⚡ <strong>Paso 2/4:</strong> Webhook recibido en <strong>Lead Automator (ID 1124959389975591)</strong>...';
        } else if (elapsed >= 2.4 && elapsed < 3.6) {
          setPipelineStep(3);
          outputEl.innerHTML = '🟢 <strong>Paso 3/4:</strong> Evaluando solvencia → Clasificado como <strong>SCORE A (Prioridad &lt;5 min)</strong>...';
        } else if (elapsed >= 3.8) {
          clearInterval(simInterval);
          setPipelineStep(4);
          if (triggerBtn) triggerBtn.disabled = false;
          statusBadge.textContent = 'ENTREGADO EN 03.8 SEG (<15s SLA)';
          statusBadge.style.color = '#10b981';

          dispatchToLeadAutomator({
            origen: "Simulador Reto 15 Segundos",
            nombre: name,
            sector: sector,
            pre_filtro: filter,
            tiempo_respuesta_seg: 3.8,
            score_asignado: "SCORE A"
          });

          const waText = encodeURIComponent(`Hola Impulso Live Media, soy ${name}. Acabo de probar el Reto de los 15 Segundos en la web (${sector} - ${filter}) y quiero instalar este sistema con Lead Automator.`);
          if (sector === 'inmobiliario') {
            outputEl.innerHTML =
              '<strong style="color:#34d399;">✅ WhatsApp disparado por Lead Automator a ' + name + ' (03.8 seg):</strong><br/>' +
              '<em>"¡Hola, ' + name + '! Soy el asistente de Impulso Live Media. Recibí tu registro con <strong>' + filter + '</strong>. Aquí tienes el video recorrido de 40s en 4K y tu <strong>Pase QR VIP Anti-Plantones</strong>. Un Cerrador Senior (Score A) te contactará en &lt;5 minutos."</em>' +
              '<div style="margin-top:10px;"><a href="https://wa.me/' + OFFICIAL_WA + '?text=' + waText + '" target="_blank" rel="noopener" style="color:#00f2fe; font-weight:800; text-decoration:underline;">📲 Abrir esta conversación en vivo en WhatsApp (56 6744 2715) →</a></div>';
          } else {
            outputEl.innerHTML =
              '<strong style="color:#34d399;">✅ WhatsApp disparado por Lead Automator a ' + name + ' (03.8 seg):</strong><br/>' +
              '<em>"¡Hola, ' + name + '! Qué gusto saludarte de Impulso Live Media. Activamos tu solicitud con <strong>' + filter + '</strong>. Aquí tienes tu Pase QR de valoración preferencial y el catálogo interactivo."</em>' +
              '<div style="margin-top:10px;"><a href="https://wa.me/' + OFFICIAL_WA + '?text=' + waText + '" target="_blank" rel="noopener" style="color:#00f2fe; font-weight:800; text-decoration:underline;">📲 Abrir esta conversación en vivo en WhatsApp (56 6744 2715) →</a></div>';
          }
        }
      }, 90);
    }

    // 6. Calculadora Financiera B2B
    function updateB2BCalc() {
      const budget = parseInt(document.getElementById('b2b-budget').value, 10);
      const cpl = parseInt(document.getElementById('b2b-cpl').value, 10);
      document.getElementById('b2b-budget-val').textContent = '$' + budget.toLocaleString() + ' MXN';
      document.getElementById('b2b-cpl-val').textContent = '$' + cpl + ' MXN';

      const totalLeads = Math.round(budget / cpl);
      const qualLeads = Math.round(totalLeads * 0.35);
      const showup = Math.round(qualLeads * 0.70);
      const lowClose = Math.max(1, Math.round(showup * 0.12));
      const highClose = Math.max(lowClose + 1, Math.round(showup * 0.15));

      document.getElementById('res-total-leads').textContent = '~' + totalLeads;
      document.getElementById('res-qual-leads').textContent = qualLeads;
      document.getElementById('res-showup').textContent = showup;
      document.getElementById('res-closings').textContent = lowClose + ' a ' + highClose;
    }

    // 7. Selector de Paquetes Comerciales B2B -> Pre-llena el Formulario 1
    function selectPackage(pkgKey) {
      const map = {
        sprint: 'Sprint 10 Días ($4,900 MXN Pago Único)',
        plan1: 'Plan 1: Impulso Arranque ($8,500 MXN/mes)',
        plan2: 'Plan 2: Impulso Growth 360° ($14,500 MXN/mes)',
        plan3: 'Plan 3: Impulso Live Partner ($22,500 MXN/mes)'
      };
      const pkgName = map[pkgKey] || map.plan2;
      const pkgSelect = document.getElementById('f1-package');
      if (pkgSelect) {
        for (let i = 0; i < pkgSelect.options.length; i++) {
          if (pkgSelect.options[i].value === pkgName) {
            pkgSelect.selectedIndex = i;
            break;
          }
        }
      }
      scrollToSection('formularios');
      const nameInput = document.getElementById('f1-name');
      if (nameInput) nameInput.focus();
    }

    // 8. Calculadora de Ingresos Creator Network
    function updateCreatorCalc() {
      const coins = parseInt(document.getElementById('cr-coins').value, 10);
      const deals = parseInt(document.getElementById('cr-deals').value, 10);
      document.getElementById('cr-coins-val').textContent = coins.toLocaleString() + ' monedas';
      document.getElementById('cr-deals-val').textContent = deals + (deals === 1 ? ' campaña + Shop' : ' campañas + Shop');

      const soloUsd = Math.round((coins * 0.5) * 0.004);
      const agencyLiveUsd = Math.round((coins * 0.5) * 0.0053 * 2.0);
      const dealsUsd = deals * 150;
      const totalAgencyUsd = agencyLiveUsd + dealsUsd;

      document.getElementById('cr-solo-usd').textContent = '$' + soloUsd.toLocaleString() + ' USD';
      document.getElementById('cr-agency-usd').textContent = '$' + totalAgencyUsd.toLocaleString() + ' USD';
    }

    // Copiar texto al portapapeles con fallback seguro para Canvas
    function copySummaryText(text, btnEl) {
      const done = () => {
        if (btnEl) {
          const prev = btnEl.textContent;
          btnEl.textContent = '✅ ¡Resumen copiado!';
          setTimeout(() => { btnEl.textContent = prev; }, 2200);
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      } else {
        fallbackCopy(text, done);
      }
    }

    function fallbackCopy(text, callback) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (callback) callback();
    }

    // 9. Envío de Formularios integrado con Lead Automator + WhatsApp 56 6744 2715
    function handleB2BSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('f1-name').value.trim();
      const company = document.getElementById('f1-company').value.trim();
      const phone = document.getElementById('f1-phone').value.trim();
      const sector = document.getElementById('f1-sector').value;
      const pkg = document.getElementById('f1-package').value;
      const budget = document.getElementById('f1-budget').value;
      const goal = document.getElementById('f1-goal').value;
      const fb = document.getElementById('f1-feedback');

      const score = budget.includes('Consolidado') || budget.includes('Escalamiento') ? 'SCORE A (Prioridad Alta)' : 'SCORE B (Calificado)';

      dispatchToLeadAutomator({
        origen: "Formulario 1 B2B Web",
        nombre: name,
        empresa: company,
        whatsapp: phone,
        sector: sector,
        paquete_seleccionado: pkg,
        presupuesto_pauta: budget,
        urgencia: goal,
        score_calculado: score
      });

      const plainText = `Hola Impulso Live Media, soy ${name} de ${company} (${sector}). Mi WhatsApp es ${phone}. Me interesa el ${pkg}, mi presupuesto de pauta es ${budget} y mi prioridad es: ${goal}.`;
      const waUrl = `https://wa.me/${OFFICIAL_WA}?text=${encodeURIComponent(plainText)}`;

      fb.style.display = 'block';
      fb.innerHTML =
        `<div><strong>✅ Registro procesado en Lead Automator (${score}):</strong></div>` +
        `<div style="margin-top:4px; color:var(--text-secondary);">Los datos de <strong>${company}</strong> ya están listos en el monitor JSON y estructurados para tu línea oficial.</div>` +
        `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">` +
        `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="font-size:0.8rem; padding:8px 14px;">📲 Abrir y Enviar en WhatsApp (56 6744 2715) →</a>` +
        `<button type="button" class="btn btn-ghost" style="font-size:0.78rem; padding:8px 12px;" onclick='copySummaryText(${JSON.stringify(plainText)}, this)'>📋 Copiar mensaje</button>` +
        `</div>`;
    }

    function handleCreatorSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('f2-name').value.trim();
      const user = document.getElementById('f2-user').value.trim();
      const phone = document.getElementById('f2-phone').value.trim();
      const city = document.getElementById('f2-city').value.trim();
      const followers = document.getElementById('f2-followers').value;
      const interest = document.getElementById('f2-interest').value;
      const fb = document.getElementById('f2-feedback');

      const routeType = followers.includes('Menos de 1,000') ? 'Ruta Incubadora UGC + Desbloqueo LIVE' : 'Ruta Roster Oficial TikTok LIVE (/streamer)';

      dispatchToLeadAutomator({
        origen: "Formulario 2 Creator Network Web",
        nombre: name,
        tiktok_user: user,
        whatsapp: phone,
        ciudad: city,
        rango_seguidores: followers,
        interes: interest,
        ruta_asignada: routeType
      });

      const plainText = `Hola Impulso Live Media, soy ${name} (${user} en TikTok, ciudad: ${city}, WhatsApp: ${phone}, seguidores: ${followers}). Quiero postularme gratis a la Creator Network (0% comisión) para: ${interest}.`;
      const waUrl = `https://wa.me/${OFFICIAL_WA}?text=${encodeURIComponent(plainText)}`;

      fb.style.display = 'block';
      fb.innerHTML =
        `<div><strong>🎉 ¡Postulación procesada para ${user} (${routeType})!</strong></div>` +
        `<div style="margin-top:4px; color:var(--text-secondary);">Recuerda tener listo tu código de invitación en <em>TikTok Studio → LIVE → Creator Network Center</em>.</div>` +
        `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">` +
        `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-pink" style="font-size:0.8rem; padding:8px 14px;">📲 Enviar a mi Manager por WhatsApp (56 6744 2715) →</a>` +
        `<button type="button" class="btn btn-ghost" style="font-size:0.78rem; padding:8px 12px;" onclick='copySummaryText(${JSON.stringify(plainText)}, this)'>📋 Copiar solicitud</button>` +
        `</div>`;
    }

    // 10. Acordeón de Preguntas Frecuentes con sincronización de icono (+/-)
    function toggleFaq(btn) {
      const item = btn.parentElement;
      const isOpen = item.classList.toggle('open');
      const icon = btn.querySelector('.faq-icon');
      if (icon) {
        icon.textContent = isOpen ? '−' : '+';
      }
    }


function revealAnchor(hash) {
  if (!hash || hash === '#') return;
  let target; try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
  if (!target) return;
  let parent = target.parentElement;
  while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
}
document.addEventListener('click', (event) => {
  const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
  if (anchor) revealAnchor(anchor.getAttribute('href'));
});
window.addEventListener('hashchange', () => revealAnchor(location.hash));
window.addEventListener('DOMContentLoaded', () => revealAnchor(location.hash));

// Decorative motion stays local: no libraries, tracking or network requests.
(() => {
  const canvas = document.getElementById('impulso-flow');
  const reactions = document.getElementById('live-reactions');
  const toggle = document.getElementById('visual-effects-toggle');
  const label = document.getElementById('visual-effects-label');
  if (!canvas || !reactions || !toggle || !label) return;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) { toggle.hidden = true; return; }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = [[117,242,227], [140,183,255], [200,159,243], [251,124,166]];
  let saved = 'on';
  try { saved = localStorage.getItem('impulso-visual-effects') || 'on'; } catch {}
  let enabled = !reduced.matches && saved !== 'off';
  let width = 0, height = 0, points = [], frame = 0, emission = 0;
  let previous = 0, elapsed = 0, burstCount = 0;
  let pointer = null;

  function resize() {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 600 ? 65 : width < 1000 ? 110 : 190;
    points = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: .5 + Math.random() * .55,
      size: index % 9 === 0 ? 1.8 : .8 + Math.random() * .5,
      color: colors[index % colors.length],
      trail: []
    }));
  }

  function draw(now) {
    frame = 0;
    if (!enabled || document.hidden) return;
    if (now - previous < 33) { frame = requestAnimationFrame(draw); return; }
    const dt = Math.min((now - previous) / 33, 2);
    previous = now;
    elapsed += .006 * dt;
    context.clearRect(0, 0, width, height);
    for (const p of points) {
      // A shared changing vector field keeps the swarm flowing in coordinated ribbons.
      let angle = Math.sin(p.x * .003 + elapsed) * 1.8
        + Math.cos(p.y * .004 - elapsed * .8) * 1.5
        + Math.sin((p.x + p.y) * .002 + elapsed * .5) * .7;
      if (pointer) {
        const dx = pointer.x - p.x, dy = pointer.y - p.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 180) {
          const pull = (1 - distance / 180) * .4;
          angle += Math.sin(Math.atan2(dy, dx) - angle) * pull;
        }
      }
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 12) p.trail.shift();
      p.x += Math.cos(angle) * p.speed * dt;
      p.y += Math.sin(angle) * p.speed * dt;
      if (p.x < -15 || p.x > width + 15 || p.y < -15 || p.y > height + 15) {
        p.x = (p.x + width) % width;
        p.y = (p.y + height) % height;
        p.trail.length = 0;
      }
      const [r,g,b] = p.color;
      if (p.trail.length > 1) {
        context.beginPath();
        context.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) context.lineTo(p.trail[i].x, p.trail[i].y);
        context.lineTo(p.x, p.y);
        context.strokeStyle = `rgba(${r},${g},${b},.15)`;
        context.lineWidth = .6;
        context.stroke();
      }
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${r},${g},${b},${p.size > 1.7 ? .72 : .4})`;
      context.fill();
    }
    frame = requestAnimationFrame(draw);
  }

  function emitReaction() {
    if (!enabled || document.hidden || reactions.childElementCount >= 8) return;
    const glyphs = ['♥','♥','♥','✦','♡','💖'];
    const node = document.createElement('span');
    node.className = 'live-reaction';
    node.style.setProperty('--reaction-left', (22 + Math.random() * 48) + '%');
    node.style.setProperty('--reaction-size', (19 + Math.random() * 13) + 'px');
    node.style.setProperty('--reaction-color', ['#fb7caf','#9df2e3','#c9a1f2','#ffb6cb'][burstCount % 4]);
    node.style.setProperty('--reaction-drift', (-19 + Math.random() * 38) + 'px');
    node.style.setProperty('--reaction-rotate', (-18 + Math.random() * 36) + 'deg');
    node.style.setProperty('--reaction-duration', (4.4 + Math.random() * 1.4) + 's');
    const inner = document.createElement('span');
    inner.textContent = glyphs[burstCount++ % glyphs.length];
    node.append(inner);
    node.addEventListener('animationend', (event) => {
      if (event.target === node) node.remove();
    }, { once: true });
    reactions.append(node);
  }

  function stop() {
    cancelAnimationFrame(frame);
    clearInterval(emission);
    frame = 0;
    emission = 0;
    reactions.replaceChildren();
  }

  function start() {
    stop();
    if (!enabled || document.hidden) return;
    previous = performance.now();
    frame = requestAnimationFrame(draw);
    emitReaction();
    emission = setInterval(emitReaction, 1700);
  }

  function sync() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Pausar efectos visuales' : 'Activar efectos visuales');
    label.textContent = enabled ? 'Pausar efectos' : 'Activar efectos';
    toggle.disabled = reduced.matches;
    if (reduced.matches) label.textContent = 'Movimiento reducido';
    document.body.classList.toggle('effects-paused', !enabled);
    if (enabled) start();
    else { stop(); context.clearRect(0, 0, width, height); }
  }

  toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('impulso-visual-effects', enabled ? 'on' : 'off'); } catch {}
    sync();
  });
  reduced.addEventListener('change', () => {
    enabled = !reduced.matches && localStoragePreference() !== 'off';
    sync();
  });
  function localStoragePreference() {
    try { return localStorage.getItem('impulso-visual-effects'); } catch { return null; }
  }
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });
  resize();
  sync();
})();
