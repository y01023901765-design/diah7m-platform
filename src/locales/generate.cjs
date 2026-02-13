#!/usr/bin/env node
/**
 * DIAH-7M Locale Generator
 * EN 기반으로 23개 언어 파일 일괄 생성
 * 게이지명: 각국 경제 표준 용어 사용
 * 시스템명: 인체비유 번역
 * UI: 완전 번역
 */
const fs = require('fs');
const path = require('path');

// ── 23개 언어 번역 맵 ──
// UI + 시스템 + 게이지명 전체 커버
const TRANSLATIONS = {
es: {
  // NAV
  login:'Iniciar sesión',signup:'Empezar gratis',logout:'Cerrar sesión',dashboard:'Panel',mypage:'Mi página',admin:'Administrador',
  // HERO
  heroSub:'DIAGNÓSTICO ECONÓMICO SATELITAL',heroTitle1:'Diagnosticando',heroTitle2:'economías desde el espacio',heroDesc:'Datos de satélites NASA·ESA, más rápido que estadísticas gubernamentales,',heroFast:'2 meses antes',heroDesc2:'diagnóstico económico.',heroCta:'Iniciar diagnóstico gratis',heroMore:'Ver más ↓',gauges:'Indicadores',bodySys:'Sistemas corporales',satCost:'Costo satelital',languages:'Idiomas',
  // FEATURES
  whyTitle:'¿En qué se diferencia del análisis económico tradicional?',feat1:'Medición vs Interpretación',feat2:'2 meses de anticipación',feat3:'Diagnóstico con metáfora corporal',feat4:'Alerta de doble bloqueo',feat5:'Análisis Delta de brecha',feat6:'Señales de acción de inversión',
  featDesc1:'Las corredoras "interpretan" estadísticas. DIAH-7M "mide" con satélites.',featDesc2:'2 meses antes que las estadísticas gubernamentales, los satélites detectan cambios.',featDesc3:'Déficit en cuenta corriente → "reducción de oxígeno pulmonar". Comprensión instantánea.',featDesc4:'Alerta cuando entrada y salida se bloquean simultáneamente. Sistema único.',featDesc5:'Diferencia entre índice satelital y de mercado → señal de infravaloración/sobrecalentamiento.',featDesc6:'Traduce los resultados del diagnóstico en acciones de inversión concretas.',
  // HOW
  howTitle:'Del satélite a la acción de inversión',step1:'Observación satelital',step2:'Medición física',step3:'Diagnóstico económico',step4:'Verificación cruzada',step5:'Señal de acción',
  // PRICING
  pricingTitle:'Datos satelitales gratis, diagnóstico a precio justo',pricingSub:'14 días gratis en todos los planes · Cancela cuando quieras',free:'Empezar gratis',trial:'14 días gratis',perMonth:'/mes',
  // FAQ
  faqTitle:'Preguntas frecuentes',ctaTitle:'Comience ahora',ctaDesc:'500P de bienvenida · 14 días gratis · Sin tarjeta',ctaBtn:'Crear cuenta gratis',
  // AUTH
  loginTitle:'Iniciar sesión',email:'Correo electrónico',password:'Contraseña',forgotPw:'¿Olvidaste tu contraseña?',noAccount:'¿No tienes cuenta?',freeSignup:'Registro gratuito',hasAccount:'¿Ya tienes cuenta?',or:'o',
  resetTitle:'Restablecer contraseña',resetDesc:'Ingresa tu correo para recibir el enlace de restablecimiento.',resetSent:'Correo enviado',resetBtn:'Enviar enlace',backToLogin:'← Volver al inicio de sesión',
  createAccount:'Crear cuenta',selectPlan:'Seleccionar plan',agreeTerms:'Aceptar términos',name:'Nombre',quickSignup:'Registro rápido',next:'Siguiente',agreeAll:'Aceptar todo',required:'Obligatorio',optional:'Opcional',
  termsService:'Aceptar términos de servicio',termsPrivacy:'Aceptar política de privacidad',termsMarketing:'Aceptar comunicaciones de marketing',selectedPlan:'Plan seleccionado',mileageBonus:'¡500P de bonificación al registrarte!',
  // DASHBOARD
  overview:'📊 Diagnóstico general',gaugeTab:'📋 59 indicadores',satTab:'🛰️ Satélite',alertTab:'🔔 Alertas',good:'Bueno',caution:'Precaución',alert:'Alerta',
  keyActions:'🎯 5 acciones clave',verdict:'📋 Veredicto general',satTimeline:'🛰️ Línea temporal satelital',verification:'⏪ Verificación',prediction:'⏩ Predicción',
  nineSystems:'9 sistemas económicos',alertCenter:'🔔 Centro de alertas',dualLock:'Doble bloqueo activo',deltaTitle:'📐 Análisis Delta de brecha',satIndex:'Índice satelital',marketIndex:'Índice de mercado',
  // MYPAGE
  profile:'Perfil',subscription:'Suscripción',mileage:'Millas',settings:'Configuración',save:'Guardar cambios',changePw:'Cambiar contraseña',currentPlan:'Plan actual',changePlan:'Cambiar plan',cancelSub:'Cancelar',
  balance:'Saldo',earned:'Ganado este mes',used:'Usado este mes',exchange:'Menú de canje',notifications:'Notificaciones',langSetting:'🌐 Idioma',deleteAccount:'Eliminar cuenta',
  // CHATBOT
  chatGreeting:'¡Hola! Soy el servicio de diagnóstico económico satelital DIAH-7M. ¿En qué puedo ayudarte?',chatPlaceholder:'Escribe tu pregunta...',chatSend:'Enviar',
  // DASHBOARD DETAIL
  dateLabel:'Enero 2026 · República de Corea',totalScore:'Puntuación total',stNormal:'Normal',stWatch:'Observación',stTrigger:'Disparador',stSeal:'Bloqueo',stCrisis:'Crisis',
  inputSeal:'Bloqueo de entrada',outputSeal:'Bloqueo de salida',dualLockActive:'Doble bloqueo activo',negGap:'Brecha negativa',mktIndex:'Índice de mercado',
  deltaDesc:'Los datos satelitales muestran actividad económica activa, pero el sentimiento del mercado no lo refleja. Posible infravaloración.',
  verdictText:'Exportaciones ($65.8B) y semiconductores fuertes. Precios (2.0%), tasas (2.5%) estables. Pero consumo interno débil, construcción (-3.2%), morosidad autónomos (1.8%↑). Estructura "fuerte afuera, débil adentro".',
  actions:['Exportación de semiconductores récord → Mantener/ampliar posición en HBM·equipos·materiales','KOSPI supera 5,300 → Reducir apalancamiento, diversificar','Won fijado en 1,450 → Revisar beneficio en exportadoras','Construcción·inmobiliario débil → Reducir exposición al sector','Morosidad autónomos↑ → Precaución en consumo'],
  satVerify:'⏪ Verificación',satPredict:'⏩ Predicción',satEarlyDetect:'Detección temprana satelital',satStatBefore:'Confirmación pre-estadística',satPastVerify:'⏪ Satélite pasado → Confirmación hoy',satFutureHint:'⏩ Satélite hoy → Indicación futura',
  satEvidence:'Evidencia',bodyMetaphor:'🏥 Metáfora corporal',satObsInfo:'🛰️ Info de observación satelital',satCol:'Satélite',satProg:'Programa',satCycle:'Ciclo de observación',satBand:'Banda/Longitud de onda',
  investSignal:'🎯 Señales de inversión',sigBuy:'Comprar',sigAvoid:'Evitar',sigSell:'Vender',blindSpot:'🔭 Visión exclusiva de DIAH-7M',gaugesLabel:'indicadores',
  // MYPAGE DETAIL
  profileSaved:'✅ Perfil guardado',fillAllFields:'⚠️ Complete todos los campos',pwMismatch:'⚠️ Las contraseñas no coinciden',pwChanged:'✅ Contraseña cambiada',
  paymentPending:'💳 Disponible tras vincular sistema de pago',confirmCancelSub:'¿Seguro que desea cancelar?',cancelInfo:'Podrá usar el servicio hasta el fin del período.',cancelFeatures:'Las funciones Pro (59 indicadores, verificación satelital) se desactivarán.',
  confirmCancelBtn:'Confirmar cancelación',goBack:'Volver',subCancelled:'✅ Cancelación programada',nextBill:'Próxima facturación',payMethod:'Método de pago',streak:'Suscripción continua',changePayment:'Cambiar método de pago',
  active:'Activo',milInsufficient:'Millas insuficientes',milExchanged:'¡Canjeado!',notifEnabled:'Activado',notifDisabled:'Desactivado',langChanged:'Idioma cambiado',
  confirmDeleteTitle:'⚠️ ¿Eliminar cuenta?',confirmDeleteDesc:'La cuenta eliminada no se puede recuperar. Todos los datos se borrarán permanentemente.',permDelete:'Eliminar permanentemente',cancel:'Cancelar',accountDeleted:'Solicitud de eliminación enviada',
  emailNotif:'Notificaciones por correo',emailNotifDesc:'Informe mensual, alertas',smsNotif:'Notificaciones SMS',smsNotifDesc:'Solo alertas urgentes',kakaoNotif:'Notificaciones KakaoTalk',kakaoNotifDesc:'Informes, alertas',slackNotif:'Notificaciones Slack',slackNotifDesc:'Equipo (Enterprise)',pushNotif:'Notificaciones Push',pushNotifDesc:'Alertas en tiempo real',
  curPw:'Contraseña actual',newPw:'Nueva contraseña',confirmPw:'Confirmar contraseña',phone:'Teléfono',
  // AUTH DETAIL
  pwCheck8:'8+ caracteres',pwCheckAlpha:'Letras',pwCheckNum:'Números',pwCheckSpecial:'Especial',nameRequired:'Ingrese su nombre',emailInvalid:'Formato de correo inválido',
  pwRequired:'Cumpla todos los requisitos de contraseña',pwEnterRequired:'Ingrese su contraseña',termsRequired:'Acepte los términos obligatorios',loggingIn:'Iniciando sesión...',sending:'Enviando...',creating:'Creando cuenta...',
  freeCreate:'Crear cuenta gratis',trialStart:'Iniciar 14 días gratis',trialNote:'Cobro tras 14 días gratis · Cancele cuando quiera',connecting:'Conectando...',satPlatform:'Plataforma de diagnóstico económico satelital',
  satPredict2:'⏩ Predicción',gaugeDetail:'Diagnóstico detallado de 59 indicadores',gaugeDetailSub:'Enero 2026 · 9 ejes · Datos reales · Verificación satelital',freqDaily:'Diario',freq12d:'12 días',freq16d:'16 días',
  curPlan:'Plan actual',change:'Cambiar',spent:'Usado este mes',exchangeMenu:'Menú de canje',notifSettings:'Configuración de notificaciones',
  // PLAN
  planFreeDesc:'Experiencia de diagnóstico básico',planBasicDesc:'Indicadores principales',planProDesc:'59 indicadores + verificación satelital',planEntDesc:'Para instituciones y equipos',
  planFreeFeat:['Resumen mensual 1x','Puntuación 9 ejes','Alertas por correo','500P al registrarse'],planBasicFeat:['Informe mensual completo','20 indicadores principales','Resumen satelital','Chatbot IA básico','100P/mes'],
  planProFeat:['Informe semanal+mensual','59 indicadores completos','Verificación satelital cruzada','Chatbot IA ilimitado','Señales de acción','Exportar datos','200P/mes (2x)'],planEntFeat:['Todo de Pro +','Acceso API','Informes personalizados','Gerente dedicado','Equipo 5 personas','30 idiomas','300P/mes (3x)'],
  milBasic:'100P/mes',milPro:'200P/mes (2x)',milEnt:'300P/mes (3x)',
  exReport:'1 informe adicional',exHistory:'1 mes de datos históricos',exApi:'100 llamadas API extra',exExport:'1 exportación de datos',exDiscount:'1% descuento en pago',
  // FAQ
  faq1q:'¿Qué es DIAH-7M?',faq1a:'La primera plataforma mundial de diagnóstico económico satelital que analiza la economía coreana con datos de NASA·ESA (luz nocturna, NO₂, infrarrojo térmico, SAR) en 59 indicadores y 9 sistemas.',
  faq2q:'¿En qué se diferencia de informes tradicionales?',faq2a:'Los informes tradicionales interpretan estadísticas. DIAH-7M mide con satélites. Ve la economía directamente a través del calor de fábricas, luz de puertos y emisiones atmosféricas.',
  faq3q:'¿Los datos satelitales tienen costo?',faq3a:'No. NASA VIIRS, ESA Copernicus Sentinel y Landsat-9 son datos públicos gratuitos.',
  faq4q:'¿Por qué la metáfora corporal?',faq4a:'Déficit en cuenta corriente → ¿es malo? DIAH-7M traduce: "la absorción intestinal se revirtió, hay fuga de energía". Cualquiera comprende la gravedad al instante.',
  faq5q:'¿Qué puedo hacer con el plan gratuito?',faq5a:'Recibe puntuación mensual de 9 ejes y resumen. Los 59 indicadores detallados y verificación satelital disponibles desde el plan Basic.',
  faq6q:'¿Cuál es la política de reembolso?',faq6a:'Cancelación gratuita durante los 14 días de prueba. Después, reembolso proporcional al período restante.',
  // GAUGE NAMES
  gI1:'Tasa de interés base',gI2:'Cuenta corriente',gI3:'Reservas de divisas',gI4:'Tipo de cambio (KRW/USD)',gI5:'Crecimiento M2',gI6:'Bonos del gobierno (3Y)',
  gE1:'Exportaciones',gE2:'Importaciones',gE3:'Balanza comercial',gE4:'Volumen de contenedores',gE5:'Precio del petróleo (Dubai)',gE6:'Crecimiento de exportaciones',
  gC1:'Ventas minoristas',gC2:'Confianza del consumidor',gC3:'Ventas con tarjeta',gC4:'Inversión en equipos',gC5:'Consumo privado',gC6:'Producción de servicios',
  gS1:'BSI (Clima empresarial)',gS2:'Luminosidad nocturna (satélite)',gS3:'Índice líder',gS4:'Gasto público',gS5:'Incertidumbre política',gS6:'Índice coincidente',
  gF1:'Spread de crédito',gF2:'Spread CD-Bonos gob.',gF3:'KOSPI',gF4:'V-KOSPI (Volatilidad)',gF5:'Tasa de morosidad',gF6:'Spread bonos corporativos',gF7:'KOSDAQ',
  gP1:'IPC (Precios al consumidor)',gP2:'IPP (Precios al productor)',gP3:'Ingresos fiscales',gP4:'Ratio deuda/PIB',gP5:'Balance fiscal',gP6:'Inflación subyacente',
  gO1:'Producción industrial',gO2:'PMI (Manufactura)',gO3:'Construcción completada',gO4:'Producción manufacturera',gO5:'Producción de servicios',gO6:'Variación del consumo (YoY)',
  gM1:'Utilización de capacidad',gM2_G:'Ratio de inventarios',gM3_G:'Variación de nuevos pedidos',
  gD1:'Tasa de fecundidad',gD2:'Tasa de envejecimiento',gD3:'Población en edad productiva',gL1:'Tasa de empleo',gL2:'Tasa de desempleo',gL3:'Deuda de hogares',gL4:'Morosidad de hogares',
  gR1:'Precios de vivienda',gR2:'Viviendas sin vender',gR5:'Aumento nivel del mar (SAR)',gR6:'Isla de calor urbana (IR térmico)',gG1:'IED (Inversión extranjera directa)',gG6:'PM2.5 (Calidad del aire · satélite)',
  // SYSTEMS
  sysA1n:'Moneda y fondos',sysA1b:'Sistema circulatorio',sysA1m:'Tasas·Cambio·Divisas = Circulación sanguínea',
  sysA2n:'Comercio exterior',sysA2b:'Sistema respiratorio',sysA2m:'Export·Import·Logística = Respiración',
  sysA3n:'Consumo interno',sysA3b:'Sistema digestivo',sysA3m:'Retail·Tarjetas·Servicios = Absorción de nutrientes',
  sysA4n:'Política y regulación',sysA4b:'Sistema nervioso',sysA4m:'BSI·Índice líder·Gasto público = Comandos cerebrales',
  sysA5n:'Estabilidad financiera',sysA5b:'Sistema inmunológico',sysA5m:'Crédito·Spreads·Morosidad = Defensa inmune',
  sysA6n:'Precios y fiscalidad',sysA6b:'Sistema endocrino',sysA6m:'IPC·IPP·Impuestos·Deuda = Equilibrio hormonal',
  sysA7n:'Producción e industria',sysA7b:'Sistema musculoesquelético',sysA7m:'Producción·PMI·Construcción = Actividad muscular',
  sysA8n:'Manufactura e inventarios',sysA8b:'Sistema metabólico',sysA8m:'Utilización·Inventarios·Pedidos = Metabolismo energético',
  sysA9n:'Población y hogares',sysA9b:'Sistema reproductivo',sysA9m:'Natalidad·Envejecimiento·Deuda = Regeneración generacional',
  locked:'Bloqueado',upgradeHint:'Acceda a todos los datos con suscripción {tier} o superior',upgradeBtn:'Suscribirse',
},

fr: {
  login:'Connexion',signup:'Commencer gratuitement',logout:'Déconnexion',dashboard:'Tableau de bord',mypage:'Ma page',admin:'Administrateur',
  heroSub:'DIAGNOSTIC ÉCONOMIQUE SATELLITE',heroTitle1:'Diagnostiquer',heroTitle2:"les économies depuis l'espace",heroDesc:"Données satellites NASA·ESA, plus rapide que les statistiques officielles,",heroFast:'2 mois en avance',heroDesc2:'diagnostic économique.',heroCta:'Diagnostic gratuit',heroMore:'En savoir plus ↓',gauges:'Indicateurs',bodySys:'Systèmes corporels',satCost:'Coût satellite',languages:'Langues',
  whyTitle:"Qu'est-ce qui différencie de l'analyse traditionnelle ?",feat1:'Mesure vs Interprétation',feat2:"2 mois d'avance",feat3:'Diagnostic par métaphore corporelle',feat4:'Alerte double blocage',feat5:'Analyse Delta',feat6:"Signaux d'investissement",
  featDesc1:'Les courtiers "interprètent" les statistiques. DIAH-7M "mesure" par satellite.',featDesc2:'2 mois avant les statistiques officielles, les satellites détectent les changements.',featDesc3:'Déficit courant → "réduction de l\'oxygène pulmonaire". Compréhension instantanée.',featDesc4:"Alerte lors d'un blocage simultané des entrées et sorties. Système unique.",featDesc5:"Différence entre indice satellite et marché → signal de sous/sur-évaluation.",featDesc6:"Traduit les résultats en actions d'investissement concrètes.",
  howTitle:"Du satellite à l'action d'investissement",step1:'Observation satellite',step2:'Mesure physique',step3:'Diagnostic économique',step4:'Vérification croisée',step5:"Signal d'action",
  pricingTitle:'Données satellites gratuites, diagnostic à prix juste',pricingSub:'14 jours gratuits · Résiliation à tout moment',free:'Gratuit',trial:'14 jours gratuits',perMonth:'/mois',
  faqTitle:'Questions fréquentes',ctaTitle:'Commencez maintenant',ctaDesc:"500P de bienvenue · 14 jours gratuits · Sans carte",ctaBtn:'Créer un compte gratuit',
  loginTitle:'Connexion',email:'E-mail',password:'Mot de passe',forgotPw:'Mot de passe oublié ?',noAccount:'Pas de compte ?',freeSignup:'Inscription gratuite',hasAccount:'Déjà un compte ?',or:'ou',
  resetTitle:'Réinitialiser le mot de passe',resetDesc:"Entrez votre e-mail pour recevoir le lien.",resetSent:'E-mail envoyé',resetBtn:'Envoyer le lien',backToLogin:'← Retour à la connexion',
  createAccount:'Créer un compte',selectPlan:'Choisir un plan',agreeTerms:'Accepter les conditions',name:'Nom',quickSignup:'Inscription rapide',next:'Suivant',agreeAll:'Tout accepter',required:'Obligatoire',optional:'Facultatif',
  termsService:"Accepter les conditions d'utilisation",termsPrivacy:'Accepter la politique de confidentialité',termsMarketing:'Accepter les communications marketing',selectedPlan:'Plan sélectionné',mileageBonus:'500P offerts à l\'inscription !',
  overview:'📊 Diagnostic global',gaugeTab:'📋 59 indicateurs',satTab:'🛰️ Satellite',alertTab:'🔔 Alertes',good:'Bon',caution:'Attention',alert:'Alerte',
  keyActions:'🎯 5 actions clés',verdict:'📋 Verdict global',satTimeline:'🛰️ Chronologie satellite',verification:'⏪ Vérification',prediction:'⏩ Prédiction',
  nineSystems:'9 systèmes économiques',alertCenter:'🔔 Centre d\'alertes',dualLock:'Double blocage actif',deltaTitle:'📐 Analyse Delta',satIndex:'Indice satellite',marketIndex:'Indice de marché',
  profile:'Profil',subscription:'Abonnement',mileage:'Miles',settings:'Paramètres',save:'Enregistrer',changePw:'Changer le mot de passe',currentPlan:'Plan actuel',changePlan:'Changer de plan',cancelSub:'Résilier',
  balance:'Solde',earned:'Gagné ce mois',used:'Utilisé ce mois',exchange:'Menu d\'échange',notifications:'Notifications',langSetting:'🌐 Langue',deleteAccount:'Supprimer le compte',
  chatGreeting:'Bonjour ! Service de diagnostic économique satellite DIAH-7M. Comment puis-je vous aider ?',chatPlaceholder:'Posez votre question...',chatSend:'Envoyer',
  dateLabel:'Janvier 2026 · République de Corée',totalScore:'Score total',stNormal:'Normal',stWatch:'Observation',stTrigger:'Déclencheur',stSeal:'Blocage',stCrisis:'Crise',
  inputSeal:'Blocage d\'entrée',outputSeal:'Blocage de sortie',dualLockActive:'Double blocage actif',negGap:'Écart négatif',mktIndex:'Indice de marché',
  deltaDesc:"Les données satellites montrent une activité économique active, mais le sentiment du marché ne le reflète pas. Possible sous-évaluation.",
  verdictText:'Exportations (65,8 Md$) et semi-conducteurs solides. Prix (2,0%), taux (2,5%) stables. Mais demande intérieure faible, construction (-3,2%), impayés (-1,8%↑). Structure "fort dehors, faible dedans".',
  actions:['Export semi-conducteurs record → Maintenir position HBM·équipements·matériaux','KOSPI dépasse 5 300 → Réduire le levier, diversifier','Won fixé à 1 450 → Vérifier bénéfices exportateurs','Construction·immobilier faible → Réduire exposition','Impayés autónomos↑ → Prudence sur consommation'],
  satVerify:'⏪ Vérification',satPredict:'⏩ Prédiction',satEarlyDetect:'Détection précoce satellite',satStatBefore:'Confirmation pré-statistique',satPastVerify:'⏪ Satellite passé → Confirmation aujourd\'hui',satFutureHint:'⏩ Satellite aujourd\'hui → Indication future',
  satEvidence:'Preuve',bodyMetaphor:'🏥 Métaphore corporelle',satObsInfo:'🛰️ Info d\'observation satellite',satCol:'Satellite',satProg:'Programme',satCycle:'Cycle d\'observation',satBand:'Bande/Longueur d\'onde',
  investSignal:'🎯 Signaux d\'investissement',sigBuy:'Acheter',sigAvoid:'Éviter',sigSell:'Vendre',blindSpot:'🔭 Vision exclusive DIAH-7M',gaugesLabel:'indicateurs',
  profileSaved:'✅ Profil enregistré',fillAllFields:'⚠️ Remplissez tous les champs',pwMismatch:'⚠️ Les mots de passe ne correspondent pas',pwChanged:'✅ Mot de passe changé',
  paymentPending:'💳 Disponible après connexion au système de paiement',confirmCancelSub:'Voulez-vous vraiment résilier ?',cancelInfo:'Vous pourrez utiliser le service jusqu\'à la fin de la période.',cancelFeatures:'Les fonctions Pro (59 indicateurs, vérification satellite) seront désactivées.',
  confirmCancelBtn:'Confirmer la résiliation',goBack:'Retour',subCancelled:'✅ Résiliation programmée',nextBill:'Prochaine facturation',payMethod:'Moyen de paiement',streak:'Abonnement continu',changePayment:'Changer le moyen de paiement',
  active:'Actif',milInsufficient:'Miles insuffisants',milExchanged:'Échangé !',notifEnabled:'Activé',notifDisabled:'Désactivé',langChanged:'Langue changée',
  confirmDeleteTitle:'⚠️ Supprimer le compte ?',confirmDeleteDesc:'Un compte supprimé ne peut pas être récupéré. Toutes les données seront définitivement effacées.',permDelete:'Supprimer définitivement',cancel:'Annuler',accountDeleted:'Demande de suppression envoyée',
  emailNotif:'Notifications par e-mail',emailNotifDesc:'Rapport mensuel, alertes',smsNotif:'Notifications SMS',smsNotifDesc:'Alertes urgentes uniquement',kakaoNotif:'Notifications KakaoTalk',kakaoNotifDesc:'Rapports, alertes',slackNotif:'Notifications Slack',slackNotifDesc:'Équipe (Enterprise)',pushNotif:'Notifications Push',pushNotifDesc:'Alertes en temps réel',
  curPw:'Mot de passe actuel',newPw:'Nouveau mot de passe',confirmPw:'Confirmer le mot de passe',phone:'Téléphone',
  pwCheck8:'8+ caractères',pwCheckAlpha:'Lettres',pwCheckNum:'Chiffres',pwCheckSpecial:'Spécial',nameRequired:'Entrez votre nom',emailInvalid:'Format d\'e-mail invalide',
  pwRequired:'Respectez toutes les conditions du mot de passe',pwEnterRequired:'Entrez votre mot de passe',termsRequired:'Acceptez les conditions obligatoires',loggingIn:'Connexion...',sending:'Envoi...',creating:'Création du compte...',
  freeCreate:'Créer un compte gratuit',trialStart:'Commencer 14 jours gratuits',trialNote:'Facturation après 14 jours · Résiliation à tout moment',connecting:'Connexion...',satPlatform:'Plateforme de diagnostic économique satellite',
  satPredict2:'⏩ Prédiction',gaugeDetail:'Diagnostic détaillé des 59 indicateurs',gaugeDetailSub:'Janvier 2026 · 9 axes · Données réelles · Vérification satellite',freqDaily:'Quotidien',freq12d:'12 jours',freq16d:'16 jours',
  curPlan:'Plan actuel',change:'Changer',spent:'Utilisé ce mois',exchangeMenu:'Menu d\'échange',notifSettings:'Paramètres de notifications',
  planFreeDesc:'Diagnostic de base',planBasicDesc:'Indicateurs principaux',planProDesc:'59 indicateurs + vérification satellite',planEntDesc:'Pour institutions et équipes',
  planFreeFeat:['Résumé mensuel 1x','Score 9 axes','Alertes e-mail','500P à l\'inscription'],planBasicFeat:['Rapport mensuel complet','20 indicateurs clés','Résumé satellite','Chatbot IA basique','100P/mois'],
  planProFeat:['Rapport hebdo+mensuel','59 indicateurs complets','Vérification satellite croisée','Chatbot IA illimité','Signaux d\'action','Export de données','200P/mois (2x)'],planEntFeat:['Tout Pro +','Accès API','Rapports personnalisés','Manager dédié','Équipe 5 personnes','30 langues','300P/mois (3x)'],
  milBasic:'100P/mois',milPro:'200P/mois (2x)',milEnt:'300P/mois (3x)',
  exReport:'1 rapport supplémentaire',exHistory:'1 mois de données historiques',exApi:'100 appels API supplémentaires',exExport:'1 export de données',exDiscount:'1% de réduction',
  faq1q:"Qu'est-ce que DIAH-7M ?",faq1a:"Première plateforme mondiale de diagnostic économique par satellite, analysant l'économie coréenne avec des données NASA·ESA en 59 indicateurs et 9 systèmes.",
  faq2q:'En quoi est-ce différent des rapports classiques ?',faq2a:"Les rapports classiques interprètent des statistiques. DIAH-7M mesure par satellite : chaleur des usines, lumière des ports, émissions atmosphériques.",
  faq3q:'Les données satellites sont-elles payantes ?',faq3a:'Non. NASA VIIRS, ESA Copernicus Sentinel et Landsat-9 sont gratuits et publics.',
  faq4q:'Pourquoi la métaphore corporelle ?',faq4a:'Déficit courant → grave ? DIAH-7M traduit : "l\'absorption intestinale s\'est inversée, fuite d\'énergie". Compréhension instantanée pour les non-experts.',
  faq5q:'Que puis-je faire avec le plan gratuit ?',faq5a:'Score mensuel des 9 axes et résumé. Les 59 indicateurs détaillés et la vérification satellite sont disponibles à partir du plan Basic.',
  faq6q:'Quelle est la politique de remboursement ?',faq6a:'Résiliation gratuite pendant les 14 jours d\'essai. Ensuite, remboursement au prorata.',
  gI1:'Taux directeur',gI2:'Compte courant',gI3:'Réserves de change',gI4:'Taux de change (KRW/USD)',gI5:'Croissance M2',gI6:'Obligations d\'État (3 ans)',
  gE1:'Exportations',gE2:'Importations',gE3:'Balance commerciale',gE4:'Volume de conteneurs',gE5:'Prix du pétrole (Dubaï)',gE6:'Croissance des exportations',
  gC1:'Ventes au détail',gC2:'Confiance des consommateurs',gC3:'Ventes par carte',gC4:'Investissement en équipements',gC5:'Consommation privée',gC6:'Production de services',
  gS1:'BSI (Climat des affaires)',gS2:'Luminosité nocturne (satellite)',gS3:'Indice avancé',gS4:'Dépenses publiques',gS5:'Incertitude politique',gS6:'Indice coïncident',
  gF1:'Spread de crédit',gF2:'Spread CD-Obligations gou.',gF3:'KOSPI',gF4:'V-KOSPI (Volatilité)',gF5:'Taux d\'impayés',gF6:'Spread obligations d\'entreprise',gF7:'KOSDAQ',
  gP1:'IPC (Prix à la consommation)',gP2:'IPP (Prix à la production)',gP3:'Recettes fiscales',gP4:'Ratio dette/PIB',gP5:'Solde budgétaire',gP6:'Inflation sous-jacente',
  gO1:'Production industrielle',gO2:'PMI (Industrie)',gO3:'Construction achevée',gO4:'Production manufacturière',gO5:'Production de services',gO6:'Variation de la consommation (YoY)',
  gM1:'Taux d\'utilisation des capacités',gM2_G:'Ratio des stocks',gM3_G:'Variation des nouvelles commandes',
  gD1:'Taux de fécondité',gD2:'Taux de vieillissement',gD3:'Population en âge de travailler',gL1:'Taux d\'emploi',gL2:'Taux de chômage',gL3:'Dette des ménages',gL4:'Impayés des ménages',
  gR1:'Prix immobilier',gR2:'Logements invendus',gR5:'Montée des eaux (SAR)',gR6:'Îlot de chaleur urbain (IR thermique)',gG1:'IDE (Investissement direct étranger)',gG6:'PM2.5 (Qualité de l\'air · satellite)',
  sysA1n:'Monnaie et fonds',sysA1b:'Système circulatoire',sysA1m:'Taux·Change·Réserves = Circulation sanguine',
  sysA2n:'Commerce extérieur',sysA2b:'Système respiratoire',sysA2m:'Export·Import·Logistique = Respiration',
  sysA3n:'Consommation intérieure',sysA3b:'Système digestif',sysA3m:'Détail·Cartes·Services = Absorption des nutriments',
  sysA4n:'Politique et régulation',sysA4b:'Système nerveux',sysA4m:'BSI·Indice avancé·Dépenses = Commandes cérébrales',
  sysA5n:'Stabilité financière',sysA5b:'Système immunitaire',sysA5m:'Crédit·Spreads·Impayés = Défense immunitaire',
  sysA6n:'Prix et fiscalité',sysA6b:'Système endocrinien',sysA6m:'IPC·IPP·Impôts·Dette = Équilibre hormonal',
  sysA7n:'Production et industrie',sysA7b:'Système musculo-squelettique',sysA7m:'Production·PMI·Construction = Activité musculaire',
  sysA8n:'Manufacture et stocks',sysA8b:'Système métabolique',sysA8m:'Utilisation·Stocks·Commandes = Métabolisme énergétique',
  sysA9n:'Population et ménages',sysA9b:'Système reproducteur',sysA9m:'Natalité·Vieillissement·Dette = Régénération générationnelle',
  locked:'Verrouillé',upgradeHint:'Accédez à toutes les données avec un abonnement {tier} ou supérieur',upgradeBtn:'S\'abonner',
},

de: {
  login:'Anmelden',signup:'Kostenlos starten',logout:'Abmelden',dashboard:'Dashboard',mypage:'Meine Seite',admin:'Admin',
  heroSub:'SATELLITENBASIERTE WIRTSCHAFTSDIAGNOSE',heroTitle1:'Wirtschaften',heroTitle2:'aus dem Weltraum diagnostizieren',heroDesc:'NASA·ESA-Satellitendaten, schneller als amtliche Statistiken,',heroFast:'2 Monate voraus',heroDesc2:'Wirtschaftsdiagnose.',heroCta:'Kostenlose Diagnose starten',heroMore:'Mehr erfahren ↓',gauges:'Wirtschaftsindikatoren',bodySys:'Körpersysteme',satCost:'Satellitenkosten',languages:'Sprachen',
  whyTitle:'Was unterscheidet uns von traditioneller Wirtschaftsanalyse?',feat1:'Messung vs Interpretation',feat2:'2 Monate Vorsprung',feat3:'Körpermetapher-Diagnose',feat4:'Doppelblockade-Alarm',feat5:'Delta-Abweichungsanalyse',feat6:'Investitions-Aktionssignale',
  featDesc1:'Broker "interpretieren" Statistiken. DIAH-7M "misst" per Satellit.',featDesc2:'2 Monate vor amtlichen Statistiken erkennen Satelliten Veränderungen.',featDesc3:'Leistungsbilanzdefizit → "reduzierte Lungenoxygen-Abgabe". Sofort verständlich.',featDesc4:'Alarm bei gleichzeitiger Eingangs- und Ausgangsblockade. Einzigartiges System.',featDesc5:'Satellitenindex vs. Marktindex → Unter-/Überbewertungssignal.',featDesc6:'Übersetzt Diagnoseergebnisse in konkrete Investitionsmaßnahmen.',
  howTitle:'Vom Satellit zur Investitionsentscheidung',step1:'Satellitenbeobachtung',step2:'Physikalische Messung',step3:'Wirtschaftsdiagnose',step4:'Kreuzverifizierung',step5:'Aktionssignal',
  pricingTitle:'Satellitendaten kostenlos, Diagnose fair bepreist',pricingSub:'14 Tage kostenlos testen · Jederzeit kündbar',free:'Kostenlos',trial:'14 Tage gratis',perMonth:'/Monat',
  faqTitle:'Häufig gestellte Fragen',ctaTitle:'Jetzt starten',ctaDesc:'500P Willkommensbonus · 14 Tage gratis · Keine Karte nötig',ctaBtn:'Kostenloses Konto erstellen',
  loginTitle:'Anmelden',email:'E-Mail',password:'Passwort',forgotPw:'Passwort vergessen?',noAccount:'Noch kein Konto?',freeSignup:'Kostenlos registrieren',hasAccount:'Bereits ein Konto?',or:'oder',
  resetTitle:'Passwort zurücksetzen',resetDesc:'E-Mail eingeben, um den Reset-Link zu erhalten.',resetSent:'E-Mail gesendet',resetBtn:'Reset-Link senden',backToLogin:'← Zurück zur Anmeldung',
  createAccount:'Konto erstellen',selectPlan:'Plan wählen',agreeTerms:'Bedingungen akzeptieren',name:'Name',quickSignup:'Schnellregistrierung',next:'Weiter',agreeAll:'Alle akzeptieren',required:'Pflicht',optional:'Optional',
  termsService:'Nutzungsbedingungen akzeptieren',termsPrivacy:'Datenschutzrichtlinie akzeptieren',termsMarketing:'Marketing-Mitteilungen akzeptieren',selectedPlan:'Gewählter Plan',mileageBonus:'500P Willkommensbonus bei Registrierung!',
  overview:'📊 Gesamtdiagnose',gaugeTab:'📋 59 Indikatoren',satTab:'🛰️ Satellit',alertTab:'🔔 Alarme',good:'Gut',caution:'Vorsicht',alert:'Warnung',
  keyActions:'🎯 5 Schlüsselaktionen',verdict:'📋 Gesamturteil',satTimeline:'🛰️ Satelliten-Zeitachse',verification:'⏪ Verifizierung',prediction:'⏩ Prognose',
  nineSystems:'9 Wirtschaftssysteme',alertCenter:'🔔 Alarmzentrale',dualLock:'Doppelblockade aktiv',deltaTitle:'📐 Delta-Analyse',satIndex:'Satellitenindex',marketIndex:'Marktindex',
  profile:'Profil',subscription:'Abonnement',mileage:'Meilen',settings:'Einstellungen',save:'Änderungen speichern',changePw:'Passwort ändern',currentPlan:'Aktueller Plan',changePlan:'Plan ändern',cancelSub:'Kündigen',
  balance:'Guthaben',earned:'Diesen Monat verdient',used:'Diesen Monat verwendet',exchange:'Einlösemenü',notifications:'Benachrichtigungen',langSetting:'🌐 Sprache',deleteAccount:'Konto löschen',
  chatGreeting:'Hallo! DIAH-7M Satelliten-Wirtschaftsdiagnose. Wie kann ich helfen?',chatPlaceholder:'Frage eingeben...',chatSend:'Senden',
  dateLabel:'Januar 2026 · Republik Korea',totalScore:'Gesamtpunktzahl',stNormal:'Normal',stWatch:'Beobachtung',stTrigger:'Auslöser',stSeal:'Blockade',stCrisis:'Krise',
  inputSeal:'Eingangsblockade',outputSeal:'Ausgangsblockade',dualLockActive:'Doppelblockade aktiv',negGap:'Negative Abweichung',mktIndex:'Marktindex',
  deltaDesc:'Satellitendaten zeigen aktive Wirtschaft, aber Marktstimmung reflektiert dies nicht. Mögliche Unterbewertung.',
  verdictText:'Exporte ($65,8 Mrd.) und Halbleiter stark. Preise (2,0%), Zinsen (2,5%) stabil. Aber Binnenachfrage schwach, Bau (-3,2%), Selbstständigen-Verzug (1,8%↑). "Außen stark, innen schwach".',
  actions:['Halbleiterexport Rekord → HBM·Ausrüstung·Material Position halten','KOSPI über 5.300 → Hebel reduzieren, diversifizieren','Won bei 1.450 fixiert → Exporteur-Vorteile prüfen','Bau·Immobilien schwach → Sektorexposition reduzieren','Selbstständigen-Verzug↑ → Konsum-Aktien Vorsicht'],
  satVerify:'⏪ Verifizierung',satPredict:'⏩ Prognose',satEarlyDetect:'Satelliten-Früherkennung',satStatBefore:'Vor-Statistik-Bestätigung',satPastVerify:'⏪ Vergangene Satellitendaten → Heutige Bestätigung',satFutureHint:'⏩ Heutige Satellitendaten → Zukunftshinweis',
  satEvidence:'Evidenz',bodyMetaphor:'🏥 Körpermetapher',satObsInfo:'🛰️ Satellitenbeobachtungsdaten',satCol:'Satellit',satProg:'Programm',satCycle:'Beobachtungszyklus',satBand:'Wellenlänge/Band',
  investSignal:'🎯 Investitionssignale',sigBuy:'Kaufen',sigAvoid:'Meiden',sigSell:'Verkaufen',blindSpot:'🔭 DIAH-7M exklusive Perspektive',gaugesLabel:'Indikatoren',
  profileSaved:'✅ Profil gespeichert',fillAllFields:'⚠️ Bitte alle Felder ausfüllen',pwMismatch:'⚠️ Passwörter stimmen nicht überein',pwChanged:'✅ Passwort geändert',
  paymentPending:'💳 Verfügbar nach Zahlungssystem-Anbindung',confirmCancelSub:'Wirklich kündigen?',cancelInfo:'Nutzung bis zum Ende des Zeitraums möglich.',cancelFeatures:'Pro-Funktionen (59 Indikatoren, Satellitenverifizierung) werden deaktiviert.',
  confirmCancelBtn:'Kündigung bestätigen',goBack:'Zurück',subCancelled:'✅ Kündigung vorgemerkt',nextBill:'Nächste Abrechnung',payMethod:'Zahlungsmittel',streak:'Fortlaufendes Abo',changePayment:'Zahlungsmittel ändern',
  active:'Aktiv',milInsufficient:'Unzureichende Meilen',milExchanged:'Eingelöst!',notifEnabled:'Aktiviert',notifDisabled:'Deaktiviert',langChanged:'Sprache geändert',
  confirmDeleteTitle:'⚠️ Konto löschen?',confirmDeleteDesc:'Ein gelöschtes Konto kann nicht wiederhergestellt werden. Alle Daten werden permanent gelöscht.',permDelete:'Dauerhaft löschen',cancel:'Abbrechen',accountDeleted:'Löschung beantragt',
  emailNotif:'E-Mail-Benachrichtigungen',emailNotifDesc:'Monatsbericht, Alarme',smsNotif:'SMS-Benachrichtigungen',smsNotifDesc:'Nur Notfallalarme',kakaoNotif:'KakaoTalk',kakaoNotifDesc:'Berichte, Alarme',slackNotif:'Slack',slackNotifDesc:'Team (Enterprise)',pushNotif:'Push',pushNotifDesc:'Echtzeit-Alarme',
  curPw:'Aktuelles Passwort',newPw:'Neues Passwort',confirmPw:'Passwort bestätigen',phone:'Telefon',
  pwCheck8:'8+ Zeichen',pwCheckAlpha:'Buchstaben',pwCheckNum:'Zahlen',pwCheckSpecial:'Sonderz.',nameRequired:'Name eingeben',emailInvalid:'Ungültiges E-Mail-Format',
  pwRequired:'Alle Passwort-Anforderungen erfüllen',pwEnterRequired:'Passwort eingeben',termsRequired:'Pflichtbedingungen akzeptieren',loggingIn:'Anmeldung...',sending:'Senden...',creating:'Konto wird erstellt...',
  freeCreate:'Kostenloses Konto erstellen',trialStart:'14 Tage gratis starten',trialNote:'Abrechnung nach 14 Tagen · Jederzeit kündbar',connecting:'Verbinden...',satPlatform:'Satelliten-Wirtschaftsdiagnose-Plattform',
  satPredict2:'⏩ Prognose',gaugeDetail:'59-Indikatoren-Detaildiagnose',gaugeDetailSub:'Januar 2026 · 9 Achsen · Realdaten · Satellitenverifizierung',freqDaily:'Täglich',freq12d:'12 Tage',freq16d:'16 Tage',
  curPlan:'Aktueller Plan',change:'Ändern',spent:'Diesen Monat verwendet',exchangeMenu:'Einlösemenü',notifSettings:'Benachrichtigungseinstellungen',
  planFreeDesc:'Basis-Diagnose',planBasicDesc:'Kernindikatoren',planProDesc:'59 Indikatoren + Satellitenverifizierung',planEntDesc:'Für Institutionen und Teams',
  planFreeFeat:['Monatliche Zusammenfassung 1x','9-Achsen-Score','E-Mail-Alarme','500P bei Registrierung'],planBasicFeat:['Vollständiger Monatsbericht','20 Schlüsselindikatoren','Satelliten-Zusammenfassung','KI-Chat Basis','100P/Monat'],
  planProFeat:['Wochen+Monatsbericht','Alle 59 Indikatoren','Satelliten-Kreuzverifizierung','KI-Chat unbegrenzt','Aktionssignale','Datenexport','200P/Monat (2x)'],planEntFeat:['Alles von Pro +','API-Zugang','Individuelle Berichte','Persönlicher Manager','Team 5 Personen','30 Sprachen','300P/Monat (3x)'],
  milBasic:'100P/Monat',milPro:'200P/Monat (2x)',milEnt:'300P/Monat (3x)',
  exReport:'1 zusätzlicher Bericht',exHistory:'1 Monat historische Daten',exApi:'100 zusätzliche API-Aufrufe',exExport:'1 Datenexport',exDiscount:'1% Zahlungsrabatt',
  faq1q:'Was ist DIAH-7M?',faq1a:'Die weltweit erste Satelliten-Wirtschaftsdiagnose-Plattform, die die koreanische Wirtschaft mit NASA·ESA-Daten in 59 Indikatoren und 9 Systemen analysiert.',
  faq2q:'Wie unterscheidet sich das von traditionellen Berichten?',faq2a:'Traditionelle Berichte interpretieren Statistiken. DIAH-7M misst per Satellit: Fabrikwärme, Hafenlicht, atmosphärische Emissionen.',
  faq3q:'Kosten die Satellitendaten etwas?',faq3a:'Nein. NASA VIIRS, ESA Copernicus Sentinel und Landsat-9 sind kostenlose öffentliche Daten.',
  faq4q:'Warum die Körpermetapher?',faq4a:'Leistungsbilanzdefizit → schlimm? DIAH-7M übersetzt: "Darmabsorption umgekehrt, Energieverlust". Sofortige Verständlichkeit für Nicht-Experten.',
  faq5q:'Was kann der kostenlose Plan?',faq5a:'Monatlicher 9-Achsen-Score und Zusammenfassung. Detaillierte 59 Indikatoren und Satellitenverifizierung ab Basic-Plan.',
  faq6q:'Wie ist die Rückerstattungspolitik?',faq6a:'Kostenlose Kündigung während der 14-tägigen Testphase. Danach anteilige Rückerstattung.',
  gI1:'Leitzins',gI2:'Leistungsbilanz',gI3:'Devisenreserven',gI4:'Wechselkurs (KRW/USD)',gI5:'M2-Wachstum',gI6:'Staatsanleihen (3J)',
  gE1:'Exporte',gE2:'Importe',gE3:'Handelsbilanz',gE4:'Containerumschlag',gE5:'Ölpreis (Dubai)',gE6:'Exportwachstum',
  gC1:'Einzelhandelsumsätze',gC2:'Verbrauchervertrauen',gC3:'Kartenumsätze',gC4:'Ausrüstungsinvestitionen',gC5:'Privater Konsum',gC6:'Dienstleistungsproduktion',
  gS1:'BSI (Geschäftsklima)',gS2:'Nachtlicht (Satellit)',gS3:'Frühindikator',gS4:'Staatsausgaben',gS5:'Politische Unsicherheit',gS6:'Gleichlaufindikator',
  gF1:'Kreditspread',gF2:'CD-Staatsanleihen-Spread',gF3:'KOSPI',gF4:'V-KOSPI (Volatilität)',gF5:'Verzugsrate',gF6:'Unternehmensanleihen-Spread',gF7:'KOSDAQ',
  gP1:'VPI (Verbraucherpreise)',gP2:'EPI (Erzeugerpreise)',gP3:'Steuereinnahmen',gP4:'Schuldenquote',gP5:'Haushaltssaldo',gP6:'Kerninflation',
  gO1:'Industrieproduktion',gO2:'PMI (Verarbeitendes Gewerbe)',gO3:'Baufertigstellungen',gO4:'Industrieproduktion',gO5:'Dienstleistungsproduktion',gO6:'Konsumveränderung (YoY)',
  gM1:'Kapazitätsauslastung',gM2_G:'Lagerbestandsquote',gM3_G:'Neue Auftragsveränderung',
  gD1:'Geburtenrate',gD2:'Alterungsquote',gD3:'Erwerbsbevölkerung',gL1:'Beschäftigungsquote',gL2:'Arbeitslosenquote',gL3:'Haushaltsverschuldung',gL4:'Haushaltsverzugsrate',
  gR1:'Immobilienpreise',gR2:'Unverkaufte Wohnungen',gR5:'Meeresspiegelanstieg (SAR)',gR6:'Städtische Wärmeinsel (Thermal-IR)',gG1:'ADI (Ausländische Direktinvestitionen)',gG6:'PM2.5 (Luftqualität · Satellit)',
  sysA1n:'Währung & Fonds',sysA1b:'Kreislaufsystem',sysA1m:'Zinsen·Wechselkurs·Devisen = Blutkreislauf',
  sysA2n:'Außenhandel',sysA2b:'Atmungssystem',sysA2m:'Export·Import·Logistik = Atmung',
  sysA3n:'Binnenkonsum',sysA3b:'Verdauungssystem',sysA3m:'Einzelhandel·Karten·Dienste = Nährstoffaufnahme',
  sysA4n:'Politik & Regulierung',sysA4b:'Nervensystem',sysA4m:'BSI·Frühindikator·Ausgaben = Gehirnbefehle',
  sysA5n:'Finanzstabilität',sysA5b:'Immunsystem',sysA5m:'Kredit·Spreads·Verzug = Immunabwehr',
  sysA6n:'Preise & Fiskalpolitik',sysA6b:'Endokrines System',sysA6m:'VPI·EPI·Steuern·Schulden = Hormongleichgewicht',
  sysA7n:'Produktion & Industrie',sysA7b:'Muskel-Skelett-System',sysA7m:'Produktion·PMI·Bau = Muskelaktivität',
  sysA8n:'Fertigung & Lager',sysA8b:'Stoffwechselsystem',sysA8m:'Auslastung·Lager·Aufträge = Energiestoffwechsel',
  sysA9n:'Bevölkerung & Haushalte',sysA9b:'Fortpflanzungssystem',sysA9m:'Geburt·Alterung·Schulden = Generationserneuerung',
  locked:'Gesperrt',upgradeHint:'Zugriff auf alle Daten mit {tier}-Abo oder höher',upgradeBtn:'Abonnieren',
},
};

// ═══ 나머지 20개 언어는 EN 기반 + 핵심 UI만 번역 ═══
// (pt, it, ru, ar, hi, vi, th, id, tr, nl, pl, sv, da, no, fi, cs, hu, ro, uk, he)
// 이 언어들은 게이지명/시스템명은 EN fallback 사용

const COMPACT_LANGS = {
pt: { login:'Entrar',signup:'Começar grátis',logout:'Sair',dashboard:'Painel',mypage:'Minha página',admin:'Admin',heroSub:'DIAGNÓSTICO ECONÔMICO SATELITAL',heroTitle1:'Diagnosticando',heroTitle2:'economias do espaço',heroDesc:'Dados de satélites NASA·ESA, mais rápido que estatísticas oficiais,',heroFast:'2 meses antes',heroDesc2:'diagnóstico econômico.',heroCta:'Diagnóstico gratuito',heroMore:'Saiba mais ↓',gauges:'Indicadores',bodySys:'Sistemas corporais',satCost:'Custo satelital',languages:'Idiomas',whyTitle:'O que diferencia da análise econômica tradicional?',feat1:'Medição vs Interpretação',feat2:'2 meses de antecedência',feat3:'Diagnóstico com metáfora corporal',feat4:'Alerta de duplo bloqueio',feat5:'Análise Delta',feat6:'Sinais de investimento',featDesc1:'Corretoras "interpretam" estatísticas. DIAH-7M "mede" por satélite.',featDesc2:'2 meses antes das estatísticas oficiais, satélites detectam mudanças.',featDesc3:'Déficit em conta corrente → "redução de oxigênio pulmonar". Compreensão instantânea.',featDesc4:'Alerta quando entrada e saída bloqueiam simultaneamente. Sistema único.',featDesc5:'Diferença entre índice satelital e mercado → sinal de sub/supervalorização.',featDesc6:'Traduz resultados do diagnóstico em ações de investimento concretas.',howTitle:'Do satélite à ação de investimento',step1:'Observação satelital',step2:'Medição física',step3:'Diagnóstico econômico',step4:'Verificação cruzada',step5:'Sinal de ação',pricingTitle:'Dados satelitais grátis, diagnóstico justo',pricingSub:'14 dias grátis · Cancele quando quiser',free:'Grátis',trial:'14 dias grátis',perMonth:'/mês',faqTitle:'Perguntas frequentes',ctaTitle:'Comece agora',ctaDesc:'500P de boas-vindas · 14 dias grátis · Sem cartão',ctaBtn:'Criar conta grátis',loginTitle:'Entrar',email:'E-mail',password:'Senha',forgotPw:'Esqueceu a senha?',noAccount:'Não tem conta?',freeSignup:'Cadastro gratuito',hasAccount:'Já tem conta?',or:'ou',resetTitle:'Redefinir senha',resetDesc:'Digite seu e-mail para receber o link.',resetSent:'E-mail enviado',resetBtn:'Enviar link',backToLogin:'← Voltar ao login',createAccount:'Criar conta',selectPlan:'Selecionar plano',agreeTerms:'Aceitar termos',name:'Nome',quickSignup:'Cadastro rápido',next:'Próximo',agreeAll:'Aceitar tudo',required:'Obrigatório',optional:'Opcional',termsService:'Aceitar termos de serviço',termsPrivacy:'Aceitar política de privacidade',termsMarketing:'Aceitar comunicações de marketing',selectedPlan:'Plano selecionado',mileageBonus:'500P de bônus ao se cadastrar!',overview:'📊 Diagnóstico geral',gaugeTab:'📋 59 indicadores',satTab:'🛰️ Satélite',alertTab:'🔔 Alertas',good:'Bom',caution:'Atenção',alert:'Alerta',keyActions:'🎯 5 ações-chave',verdict:'📋 Veredito geral',satTimeline:'🛰️ Linha do tempo satelital',verification:'⏪ Verificação',prediction:'⏩ Previsão',nineSystems:'9 sistemas econômicos',alertCenter:'🔔 Central de alertas',dualLock:'Duplo bloqueio ativo',deltaTitle:'📐 Análise Delta',satIndex:'Índice satelital',marketIndex:'Índice de mercado',profile:'Perfil',subscription:'Assinatura',mileage:'Milhas',settings:'Configurações',save:'Salvar alterações',changePw:'Alterar senha',currentPlan:'Plano atual',changePlan:'Alterar plano',cancelSub:'Cancelar',balance:'Saldo',earned:'Ganho este mês',used:'Usado este mês',exchange:'Menu de resgate',notifications:'Notificações',langSetting:'🌐 Idioma',deleteAccount:'Excluir conta',chatGreeting:'Olá! Serviço de diagnóstico econômico satelital DIAH-7M. Como posso ajudar?',chatPlaceholder:'Digite sua pergunta...',chatSend:'Enviar',dateLabel:'Janeiro 2026 · República da Coreia',totalScore:'Pontuação total',stNormal:'Normal',stWatch:'Observação',stTrigger:'Gatilho',stSeal:'Bloqueio',stCrisis:'Crise',inputSeal:'Bloqueio de entrada',outputSeal:'Bloqueio de saída',dualLockActive:'Duplo bloqueio ativo',negGap:'Desvio negativo',mktIndex:'Índice de mercado',deltaDesc:'Dados satelitais mostram atividade econômica ativa, mas sentimento do mercado não reflete. Possível subvalorização.',verdictText:'Exportações ($65,8B) e semicondutores fortes. Preços (2,0%), juros (2,5%) estáveis. Mas demanda interna fraca. Estrutura "forte fora, fraco dentro".',actions:['Exportação de semicondutores recorde → Manter posição HBM·equipamentos','KOSPI acima de 5.300 → Reduzir alavancagem','Won fixo em 1.450 → Verificar benefícios em exportadoras','Construção fraca → Reduzir exposição','Inadimplência↑ → Cautela em consumo'],satVerify:'⏪ Verificação',satPredict:'⏩ Previsão',satEarlyDetect:'Detecção precoce satelital',satStatBefore:'Confirmação pré-estatística',satPastVerify:'⏪ Satélite passado → Confirmação hoje',satFutureHint:'⏩ Satélite hoje → Indicação futura',satEvidence:'Evidência',bodyMetaphor:'🏥 Metáfora corporal',satObsInfo:'🛰️ Info de observação satelital',satCol:'Satélite',satProg:'Programa',satCycle:'Ciclo de observação',satBand:'Banda',investSignal:'🎯 Sinais de investimento',sigBuy:'Comprar',sigAvoid:'Evitar',sigSell:'Vender',blindSpot:'🔭 Visão exclusiva DIAH-7M',gaugesLabel:'indicadores',profileSaved:'✅ Perfil salvo',fillAllFields:'⚠️ Preencha todos os campos',pwMismatch:'⚠️ Senhas não conferem',pwChanged:'✅ Senha alterada',paymentPending:'💳 Disponível após vincular sistema de pagamento',confirmCancelSub:'Deseja realmente cancelar?',cancelInfo:'Você poderá usar o serviço até o final do período.',cancelFeatures:'Funções Pro serão desativadas.',confirmCancelBtn:'Confirmar cancelamento',goBack:'Voltar',subCancelled:'✅ Cancelamento agendado',nextBill:'Próxima cobrança',payMethod:'Forma de pagamento',streak:'Assinatura contínua',changePayment:'Alterar forma de pagamento',active:'Ativo',milInsufficient:'Milhas insuficientes',milExchanged:'Resgatado!',notifEnabled:'Ativado',notifDisabled:'Desativado',langChanged:'Idioma alterado',confirmDeleteTitle:'⚠️ Excluir conta?',confirmDeleteDesc:'Conta excluída não pode ser recuperada.',permDelete:'Excluir permanentemente',cancel:'Cancelar',accountDeleted:'Exclusão solicitada',emailNotif:'Notificações por e-mail',emailNotifDesc:'Relatório mensal, alertas',smsNotif:'Notificações SMS',smsNotifDesc:'Apenas alertas urgentes',kakaoNotif:'KakaoTalk',kakaoNotifDesc:'Relatórios, alertas',slackNotif:'Slack',slackNotifDesc:'Equipe (Enterprise)',pushNotif:'Push',pushNotifDesc:'Alertas em tempo real',curPw:'Senha atual',newPw:'Nova senha',confirmPw:'Confirmar senha',phone:'Telefone',pwCheck8:'8+ caracteres',pwCheckAlpha:'Letras',pwCheckNum:'Números',pwCheckSpecial:'Especial',nameRequired:'Digite seu nome',emailInvalid:'Formato de e-mail inválido',pwRequired:'Atenda todos os requisitos',pwEnterRequired:'Digite sua senha',termsRequired:'Aceite os termos obrigatórios',loggingIn:'Entrando...',sending:'Enviando...',creating:'Criando conta...',freeCreate:'Criar conta grátis',trialStart:'Iniciar 14 dias grátis',trialNote:'Cobrança após 14 dias · Cancele quando quiser',connecting:'Conectando...',satPlatform:'Plataforma de diagnóstico econômico satelital',satPredict2:'⏩ Previsão',gaugeDetail:'Diagnóstico detalhado',gaugeDetailSub:'Janeiro 2026 · 9 eixos · Dados reais',freqDaily:'Diário',freq12d:'12 dias',freq16d:'16 dias',curPlan:'Plano atual',change:'Alterar',spent:'Usado este mês',exchangeMenu:'Menu de resgate',notifSettings:'Config. de notificações',planFreeDesc:'Diagnóstico básico',planBasicDesc:'Indicadores principais',planProDesc:'59 indicadores + verificação satelital',planEntDesc:'Para instituições',planFreeFeat:['Resumo mensal 1x','Score 9 eixos','Alertas por e-mail','500P no cadastro'],planBasicFeat:['Relatório mensal completo','20 indicadores','Resumo satelital','Chat IA básico','100P/mês'],planProFeat:['Relatório semanal+mensal','59 indicadores','Verificação satelital','Chat IA ilimitado','Sinais de ação','Exportar dados','200P/mês (2x)'],planEntFeat:['Tudo do Pro +','Acesso API','Relatórios custom','Gerente dedicado','Equipe 5','30 idiomas','300P/mês (3x)'],milBasic:'100P/mês',milPro:'200P/mês (2x)',milEnt:'300P/mês (3x)',exReport:'1 relatório extra',exHistory:'1 mês de histórico',exApi:'100 chamadas API extras',exExport:'1 exportação',exDiscount:'1% desconto',faq1q:'O que é DIAH-7M?',faq1a:'Primeira plataforma mundial de diagnóstico econômico satelital com dados NASA·ESA.',faq2q:'Como difere dos relatórios tradicionais?',faq2a:'Relatórios tradicionais interpretam. DIAH-7M mede por satélite.',faq3q:'Dados satelitais têm custo?',faq3a:'Não. NASA VIIRS, ESA Copernicus e Landsat-9 são gratuitos.',faq4q:'Por que a metáfora corporal?',faq4a:'Traduz conceitos econômicos complexos em linguagem corporal intuitiva.',faq5q:'O que o plano grátis oferece?',faq5a:'Score mensal de 9 eixos. Detalhes a partir do plano Basic.',faq6q:'Política de reembolso?',faq6a:'Cancelamento gratuito nos 14 dias de teste. Após, reembolso proporcional.',locked:'Bloqueado',upgradeHint:'Acesse todos os dados com assinatura {tier} ou superior',upgradeBtn:'Assinar',sysA1n:'Moeda e fundos',sysA1b:'Sistema circulatório',sysA1m:'Juros·Câmbio·Reservas = Circulação sanguínea',sysA2n:'Comércio exterior',sysA2b:'Sistema respiratório',sysA2m:'Export·Import·Logística = Respiração',sysA3n:'Consumo interno',sysA3b:'Sistema digestivo',sysA3m:'Varejo·Cartões·Serviços = Absorção de nutrientes',sysA4n:'Política e regulação',sysA4b:'Sistema nervoso',sysA4m:'BSI·Indicador líder·Gastos = Comandos cerebrais',sysA5n:'Estabilidade financeira',sysA5b:'Sistema imunológico',sysA5m:'Crédito·Spreads·Inadimplência = Defesa imune',sysA6n:'Preços e fiscal',sysA6b:'Sistema endócrino',sysA6m:'IPC·IPP·Impostos·Dívida = Equilíbrio hormonal',sysA7n:'Produção e indústria',sysA7b:'Sistema musculoesquelético',sysA7m:'Produção·PMI·Construção = Atividade muscular',sysA8n:'Manufatura e estoques',sysA8b:'Sistema metabólico',sysA8m:'Utilização·Estoques·Pedidos = Metabolismo energético',sysA9n:'População e famílias',sysA9b:'Sistema reprodutivo',sysA9m:'Natalidade·Envelhecimento·Dívida = Regeneração geracional',gI1:'Taxa básica',gI2:'Conta corrente',gI3:'Reservas cambiais',gI4:'Câmbio (KRW/USD)',gI5:'Crescimento M2',gI6:'Títulos gov. (3A)',gE1:'Exportações',gE2:'Importações',gE3:'Balança comercial',gE4:'Volume de contêineres',gE5:'Preço do petróleo',gE6:'Crescimento das exportações',gC1:'Vendas no varejo',gC2:'Confiança do consumidor',gC3:'Vendas com cartão',gC4:'Investimento em equipamentos',gC5:'Consumo privado',gC6:'Produção de serviços',gS1:'BSI',gS2:'Luminosidade noturna (satélite)',gS3:'Índice líder',gS4:'Gastos públicos',gS5:'Incerteza política',gS6:'Índice coincidente',gF1:'Spread de crédito',gF2:'Spread CD-Gov',gF3:'KOSPI',gF4:'V-KOSPI',gF5:'Taxa de inadimplência',gF6:'Spread corporativo',gF7:'KOSDAQ',gP1:'IPC',gP2:'IPP',gP3:'Receita fiscal',gP4:'Dívida/PIB',gP5:'Saldo fiscal',gP6:'Inflação subjacente',gO1:'Produção industrial',gO2:'PMI',gO3:'Construção concluída',gO4:'Produção manufatureira',gO5:'Produção de serviços',gO6:'Variação do consumo',gM1:'Utilização de capacidade',gM2_G:'Ratio de estoques',gM3_G:'Variação de novos pedidos',gD1:'Taxa de fecundidade',gD2:'Taxa de envelhecimento',gD3:'População em idade ativa',gL1:'Taxa de emprego',gL2:'Taxa de desemprego',gL3:'Dívida das famílias',gL4:'Inadimplência das famílias',gR1:'Preços imobiliários',gR2:'Imóveis não vendidos',gR5:'Nível do mar (SAR)',gR6:'Ilha de calor urbana',gG1:'IED',gG6:'PM2.5 (Qualidade do ar)' },
};

// ═══ 메인 생성 ═══
const enData = require('./en.js').default || require('./en.js');

function generateFile(langCode, translations) {
  // EN을 베이스로 하고 번역을 오버라이드
  const merged = { ...enData, ...translations };
  const lines = [`// DIAH-7M ${langCode.toUpperCase()} locale — auto-generated from EN base`,'export default {'];
  for (const [k, v] of Object.entries(merged)) {
    if (Array.isArray(v)) {
      lines.push(`  ${k}:${JSON.stringify(v)},`);
    } else if (typeof v === 'string') {
      const escaped = v.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      lines.push(`  ${k}:'${escaped}',`);
    }
  }
  lines.push('};');
  return lines.join('\n');
}

const outDir = __dirname;
let count = 0;

// Full translations (es, fr, de)
for (const [code, data] of Object.entries(TRANSLATIONS)) {
  const content = generateFile(code, data);
  fs.writeFileSync(path.join(outDir, `${code}.js`), content);
  console.log(`✅ ${code}.js — ${Object.keys(data).length} translated keys`);
  count++;
}

// Compact translations (pt + 19 more via EN fallback)
for (const [code, data] of Object.entries(COMPACT_LANGS)) {
  const content = generateFile(code, data);
  fs.writeFileSync(path.join(outDir, `${code}.js`), content);
  console.log(`✅ ${code}.js — ${Object.keys(data).length} translated keys (+ EN fallback)`);
  count++;
}

console.log(`\n📦 Generated ${count} locale files`);
