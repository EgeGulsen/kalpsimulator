/* Kalp Simülatörü: English "Build a patient" data (same structure and logic as patients.js).
   Adult values, summarised from ESC 2020–2024, ERC 2021 and AHA guidelines. For education only. */
(function(){
'use strict';
const HASTA={
  kronik:[['astim','Asthma'],['koah','COPD'],['hfref','Heart failure (EF <40%)'],['kah','Coronary artery disease'],['kbh','Chronic kidney disease (eGFR <30)'],
    ['kc','Liver cirrhosis'],['dm','Diabetes'],['ht','Hypertension'],['inme','History of stroke / TIA'],['kanama','Active or recent major bleeding'],['gebe','Pregnancy']],
  durum:[['inst','Haemodynamically unstable (SBP <90, shock, altered consciousness, ischaemic pain, acute HF)']],
  ilac:[['bb','Beta blocker'],['kkb','Verapamil / diltiazem'],['dig','Digoxin'],['antikoag','Warfarin or DOAC'],['pde5','Sildenafil / tadalafil (last 48 hours)'],
    ['qt','QT-prolonging drug (e.g. azithromycin, haloperidol, sotalol)'],['dipir','Dipyridamole'],['teof','Theophylline / aminophylline'],['acei','ACEi / ARB / spironolactone']],
  alerji:[['asa','Aspirin / NSAIDs'],['hit','Heparin (history of HIT)'],['kontrast','Iodinated contrast'],['amio','Amiodarone'],['lido','Lidocaine / amide local anaesthetics'],['pen','Penicillin']]
};
const ALL={}; for(const g in HASTA) for(const [k,n] of HASTA[g]) ALL[k]=n;

const IV=(t,c)=>({k:'iv',t,c});
const CV=(t)=>({k:'cardiovert',t});
const amio=(dose,note,next)=>({n:'Amiodarone',cls:'Antiarrhythmic (class III)',dose,note,anim:IV('IV amiodarone',0xb5651d),next,
  rules:[['amio','no','Amiodarone allergy.'],['kontrast','warn','Amiodarone contains iodine; the label lists iodine hypersensitivity as a contraindication. A contrast reaction is not a true iodine allergy, but take care.'],
    ['qt','warn','Torsades risk rises with another QT-prolonging drug.'],['dig','warn','Roughly doubles the digoxin level: halve the digoxin dose.'],
    ['antikoag','info','Potentiates warfarin: monitor the INR closely.'],['kc','warn','Hepatotoxic: caution in liver disease.'],['gebe','warn','Fetal thyroid and developmental effects: avoid in pregnancy if possible.']]});
const sync=(j,next,extra)=>({n:'Synchronised electrical cardioversion',cls:'Electrical therapy',dose:j+', under sedation/analgesia, synchronised to the QRS',
  note:'First-line treatment for a haemodynamically unstable tachyarrhythmia.',anim:CV('Synchronised cardioversion'),next,rules:[['inst','info','This patient is unstable: first choice, without losing time on drugs.']].concat(extra||[])});
const bbIV={n:'Metoprolol',cls:'Beta blocker (IV)',dose:'2.5–5 mg IV over 2 min; repeat every 5 min, up to 15 mg total',note:'Rate control.',anim:IV('IV metoprolol',0x1f8fe0),
  rules:[['astim','warn','Even though cardioselective, it can cause bronchospasm; avoid in active or severe asthma.'],['koah','info','Cardioselective beta blockers are generally tolerated in COPD.'],
    ['hfref','warn','Not given in acute decompensated HF; cautious low dose in stable HFrEF.'],['inst','no','Worsens hypotension and low output.'],
    ['kkb','warn','With IV verapamil/diltiazem: risk of AV block and hypotension.'],['bb','info','Already on a beta blocker: review dose and adherence.']]};
const ndhp=(name,dose,next)=>({n:name,cls:'Non-dihydropyridine CCB (IV)',dose,note:'Slows the AV node.',anim:IV('IV '+name.toLowerCase(),0x1f8fe0),next,
  rules:[['hfref','no','Negative inotrope with LVEF <40%: contraindicated.'],['inst','no','Worsens hypotension.'],['bb','warn','In a patient on a beta blocker: risk of AV block, bradycardia and hypotension.'],
    ['dig','warn','Raises the digoxin level and increases the risk of AV block.'],['kkb','info','Already on an oral CCB.']]});
const doak={n:'Apixaban (DOAC)',cls:'Anticoagulant',dose:'5 mg twice daily (2.5 mg twice daily if ≥2 criteria: age ≥80, weight ≤60 kg, creatinine ≥1.5 mg/dL)',
  note:'Stroke prevention: recommended at CHA₂DS₂-VA ≥2, considered at 1.',
  rules:[['gebe','no','DOACs are contraindicated in pregnancy: use low-molecular-weight heparin.'],['kanama','no','Do not start an anticoagulant during active bleeding.'],
    ['kbh','warn','Not recommended if CrCl <15; dose-reduce at 15–29, with caution.'],['kc','warn','Contraindicated in Child-Pugh C cirrhosis; caution in B.'],['antikoag','info','Already on an anticoagulant: do not add a second agent.']],
  calc:P=>{ let n=0; if(P.yas>=80)n++; if(P.kilo&&P.kilo<=60)n++; if(P.sel.has('kbh'))n++; return n>=2?['info',`This patient meets ${n} dose-reduction criteria: 2.5 mg twice daily.`]:null; }};
const varf={n:'Warfarin',cls:'Anticoagulant (VKA)',dose:'Target INR 2–3',note:'Preferred with a mechanical valve or moderate-severe mitral stenosis; otherwise DOACs come first.',
  rules:[['gebe','no','Teratogenic (especially weeks 6–12): not used in pregnancy.'],['kanama','no','Not started during active bleeding.'],['kc','warn','The INR may already be deranged in cirrhosis; monitor closely.']]};
const causeAV={n:'Review AV-node-slowing drugs',cls:'Treat the cause',dose:'Beta blockers, verapamil/diltiazem, digoxin, amiodarone',
  note:'Drug-induced bradycardia is common and reversible.',base:['info',''],
  rules:[['bb','info','On a beta blocker: stop it; in overdose, glucagon (3–10 mg IV).'],['kkb','info','On a CCB: stop it; in overdose, IV calcium and high-dose insulin.'],
    ['dig','info','On digoxin: check the level and potassium; digoxin-specific Fab in severe toxicity.']]};
const atropin=(base,next)=>({n:'Atropine',cls:'Anticholinergic',dose:'0.5 mg IV every 3–5 min, up to 3 mg',note:'First drug in symptomatic bradycardia.',first:!base,base,
  anim:IV('IV atropine',0x7b4dff),next,res:next?'Heart rate increased.':'No or inadequate response: move to pacing.'});
const tcp={n:'Transcutaneous pacing',cls:'Electrical therapy',dose:'Demand mode at 60–70/min; confirm mechanical capture (pulse); analgesia/sedation',
  note:'Bridge in unstable bradycardia unresponsive to atropine.',anim:CV('Transcutaneous pacing'),next:'paced',rules:[['inst','info','This patient is unstable: start immediately if atropine fails.']]};
const adrInf={n:'Adrenaline infusion',cls:'Chronotrope',dose:'2–10 µg/min IV infusion (alternatives: dopamine 5–20 µg/kg/min, isoprenaline 5 µg/min)',note:'Bridge while pacing is prepared.',anim:IV('Adrenaline infusion',0xe0523f),
  rules:[['kah','warn','Increases myocardial oxygen demand: risk of ischaemia.']]};
const ppm=(first)=>({n:'Permanent pacemaker',cls:'Device',dose:'After reversible causes (drugs, ischaemia, electrolytes) are excluded',note:'Definitive treatment for Mobitz II and complete block.',first,
  anim:IV('Implanting a permanent pacemaker',0xf2a000),next:'paced'});
const asa=(dose)=>({n:'Aspirin',cls:'Antiplatelet',dose,first:true,anim:IV('Aspirin',0xe8e2d6),
  rules:[['asa','no','Aspirin allergy: continue with clopidogrel; aspirin desensitisation if needed.'],['kanama','no','Not given during active bleeding.'],['antikoag','info','Bleeding risk in a patient on an OAC: keep the duration short.']]});
const heparin=(dose,note)=>({n:'Heparin (UFH)',cls:'Anticoagulant',dose,note,anim:IV('IV heparin',0x5b6fd6),
  rules:[['hit','no','History of HIT: no heparin; use bivalirudin or argatroban.'],['kanama','no','Not given during active bleeding.'],['antikoag','warn','Already on an OAC: dose according to INR/drug timing.']]});
const nitrat=(base)=>({n:'Nitrate (sublingual)',cls:'Vasodilator',dose:'0.4 mg SL every 5 min, up to 3 times; IV infusion if pain persists',note:'For pain, hypertension and pulmonary congestion.',base,
  rules:[['pde5','no','PDE5 inhibitor in the last 24–48 hours: severe, refractory hypotension.'],['inst','no','Not given if SBP <90.']]});
const fibrin={n:'Fibrinolytic (tenecteplase)',cls:'Thrombolytic',dose:'Single weight-based bolus (30–50 mg); half dose at age ≥75',
  note:'If primary PCI cannot be done within 120 min and pain is <12 hours old.',
  rules:[['kanama','no','Active bleeding: absolute contraindication.'],['inme','warn','Ischaemic stroke within 3 months is absolute, older is relative; any history of haemorrhagic stroke is always absolute.'],
    ['antikoag','warn','OAC use is a relative contraindication.'],['ht','info','Uncontrolled hypertension (>180/110) is a relative contraindication.'],['gebe','warn','Pregnancy is a relative contraindication.']],
  calc:P=>P.yas>=75?['info','This patient is ≥75: half dose.']:null};

const AF=(cvJ)=>[
  sync(cvJ,'nsr',[['!antikoag','warn','If AF is ≥48 hours or of unknown duration, give ≥3 weeks of anticoagulation or exclude thrombus with TOE before elective cardioversion (do not wait if unstable).']]),
  Object.assign({},bbIV,{first:true}),
  ndhp('Diltiazem','0.25 mg/kg IV over 2 min (about 15–20 mg); 0.35 mg/kg after 15 min',null),
  {n:'Digoxin',cls:'Cardiac glycoside',dose:'0.25–0.5 mg IV load; at most 1–1.5 mg in 24 hours',note:'Onset within hours; added for rate control in HF.',anim:IV('IV digoxin',0x12a36b),
    rules:[['kbh','warn','Renally excreted: reduce the dose, monitor levels.'],['dig','warn','Already on digoxin: toxicity risk, check the level first.'],['hfref','info','Can be added to a beta blocker in HFrEF.']]},
  amio('300 mg IV over 1 hour (in HF or instability), then 900 mg/24 h','Rhythm and rate control; a safe option in HFrEF.','nsr'),
  doak,varf];
const RX={
  af:AF('Biphasic 120–200 J'),
  flutter:AF('Biphasic 50–100 J').concat([{n:'Cavotricuspid isthmus ablation',cls:'Interventional',dose:'Elective',note:'Success >90% in typical flutter: first choice if recurrent.'}]),
  svt:[
    {n:'Modified Valsalva manoeuvre',cls:'Vagal manoeuvre',dose:'15 s strain at 40 mmHg semi-recumbent, then lie flat with legs raised to 45°',
      note:'First step in stable SVT (success ~40%).',first:true,anim:{k:'vagal',t:'Modified Valsalva'},res:'It did not terminate this time: move to adenosine.'},
    {n:'Adenosine',cls:'Purinergic agent',dose:'6 mg rapid IV push + 20 mL saline flush; then 12 mg, then 12 mg (18 mg) if needed',note:'Blocks the AV node within seconds.',first:true,
      anim:IV('Adenosine rapid IV bolus',0x2f7bff),next:'nsr',res:'A brief asystole followed by sinus rhythm.',
      rules:[['astim','warn','Can cause bronchospasm: avoid in severe/active asthma; in mild asthma it can be given with a bronchodilator ready.'],['koah','warn','Risk of bronchospasm: caution.'],
        ['dipir','warn','Dipyridamole blocks adenosine breakdown: effect increased, start at 3 mg.'],['teof','warn','Theophylline blocks adenosine receptors: effect reduced, a higher dose may be needed.'],
        ['inst','warn','Do not delay cardioversion in an unstable patient.']]},
    ndhp('Verapamil','5–10 mg IV over 2 min; repeat after 15–30 min','nsr'),
    Object.assign({},bbIV,{next:'nsr'}),
    sync('Biphasic 70–120 J','nsr')],
  wpw:[
    sync('Biphasic 120–200 J','nsr',[]),
    {n:'Procainamide',cls:'Antiarrhythmic (class Ia)',dose:'10–15 mg/kg IV at 20–50 mg/min',note:'Slows conduction over the accessory pathway in pre-excited AF.',first:true,anim:IV('IV procainamide',0xb5651d),next:'nsr',
      rules:[['hfref','warn','Negative inotrope: caution in severe HF.'],['qt','warn','Prolongs the QT: caution with QT-prolonging drugs.'],['inst','no','If unstable, cardiovert.'],['kbh','warn','Its active metabolite (NAPA) accumulates.']]},
    {n:'Ibutilide',cls:'Antiarrhythmic (class III)',dose:'1 mg IV over 10 min (<60 kg: 0.01 mg/kg); repeat once if needed',note:'Alternative pharmacological cardioversion.',anim:IV('IV ibutilide',0xb5651d),next:'nsr',
      rules:[['qt','warn','Torsades risk; not given with QT-prolonging drugs.']]},
    {n:'Adenosine',cls:'AV nodal blocker',dose:'—',base:['no','In pre-excited AF, blocking the AV node diverts conduction to the accessory pathway, raising the rate and possibly causing VF.']},
    {n:'Verapamil / diltiazem',cls:'AV nodal blocker',dose:'—',base:['no','Contraindicated in pre-excited AF: rapid accessory-pathway conduction and VF risk.']},
    {n:'Digoxin',cls:'AV nodal blocker',dose:'—',base:['no','Shortens the accessory pathway’s refractory period: VF risk.']},
    {n:'Beta blocker (IV)',cls:'AV nodal blocker',dose:'—',base:['no','AV nodal blockers are not given in pre-excited AF.']},
    {n:'Catheter ablation',cls:'Interventional',dose:'Elective',note:'Definitive treatment in symptomatic WPW and high-risk pathways.'}],
  vt:[
    sync('Biphasic 120–150 J, escalating','nsr',[]),
    amio('300 mg IV over 10–20 min, then 900 mg/24 h','Preferred with structural heart disease or HF.','nsr'),
    {n:'Procainamide',cls:'Antiarrhythmic (class Ia)',dose:'10–15 mg/kg IV at 20–50 mg/min',note:'Effective in stable VT without structural heart disease (ESC 2022).',anim:IV('IV procainamide',0xb5651d),next:'nsr',
      rules:[['hfref','warn','Negative inotrope: avoid in severe HF.'],['qt','warn','Prolongs the QT.'],['inst','no','If unstable, cardiovert.'],['kbh','warn','NAPA accumulates.']]},
    {n:'Lidocaine',cls:'Antiarrhythmic (class Ib)',dose:'1–1.5 mg/kg IV, then 0.5–0.75 mg/kg; infusion 1–4 mg/min',note:'An alternative, especially in ischaemic VT.',anim:IV('IV lidocaine',0x12a36b),next:'nsr',
      rules:[['lido','no','Allergy to lidocaine/amide local anaesthetics.'],['kc','warn','Hepatically metabolised: reduce the dose.'],['hfref','warn','Clearance falls in HF: reduce the dose.']]},
    {n:'Verapamil',cls:'CCB',dose:'—',base:['no','A broad-complex tachycardia is VT until proven otherwise; verapamil can cause haemodynamic collapse.']},
    {n:'Correct electrolytes',cls:'Supportive',dose:'K⁺ >4.0 mmol/L, Mg²⁺ >2.0 mg/dL',note:'Prevents recurrence.'}],
  torsades:[
    {n:'Magnesium sulphate',cls:'Electrolyte',dose:'2 g IV over 10–15 min (bolus if pulseless); repeat or infuse if needed',note:'First treatment even if serum Mg is normal.',first:true,anim:IV('IV magnesium sulphate',0x0f6fd6),next:'nsr',
      rules:[['kbh','warn','Risk of hypermagnesaemia: monitor levels with repeat doses.']]},
    {n:'Stop QT-prolonging drugs',cls:'Treat the cause',dose:'Antiarrhythmics, macrolides, antipsychotics, methadone, etc.',first:true,base:['info',''],rules:[['qt','info','This patient’s QT-prolonging drug must be stopped immediately.']]},
    {n:'Potassium replacement',cls:'Electrolyte',dose:'Target K⁺ 4.5–5.0 mmol/L',rules:[['kbh','warn','Slowly, with level monitoring, in renal failure.']]},
    {n:'Temporary overdrive pacing',cls:'Electrical therapy',dose:'90–110/min (alternative: isoprenaline infusion)',note:'For recurrent torsades driven by bradycardia and pauses.'},
    {n:'Defibrillation',cls:'Electrical therapy',dose:'Unsynchronised 150–200 J if pulseless or degenerating to VF',anim:{k:'defib',t:'Defibrillation'},next:'nsr'},
    {n:'Amiodarone',cls:'Antiarrhythmic',dose:'—',base:['no','Prolongs the QT further: worsens torsades.']}],
  vf:[
    {n:'Defibrillation',cls:'Electrical therapy',dose:'Biphasic 150–200 J; then equal or escalating energy. 2 min of CPR immediately after each shock',first:true,anim:{k:'defib',t:'Defibrillation'},next:'nsr',res:'Return of spontaneous circulation.'},
    {n:'Cardiopulmonary resuscitation',cls:'Basic life support',dose:'100–120/min, 5–6 cm deep, 30:2; keep pauses <5 s',first:true,anim:{k:'cpr',t:'Chest compressions'}},
    {n:'Adrenaline',cls:'Vasopressor',dose:'1 mg IV/IO after the 3rd shock, then every 3–5 min',anim:IV('Adrenaline 1 mg IV',0xe0523f)},
    amio('300 mg IV/IO bolus after the 3rd shock; 150 mg after the 5th shock','Shock-refractory VF/pulseless VT.',null),
    {n:'Lidocaine',cls:'Antiarrhythmic',dose:'1–1.5 mg/kg IV/IO (if amiodarone is unavailable)',anim:IV('IV lidocaine',0x12a36b),rules:[['lido','no','Lidocaine allergy.']]},
    {n:'Reversible causes (4 Hs and 4 Ts)',cls:'Treat the cause',dose:'Hypoxia, hypovolaemia, hypo/hyperkalaemia, hypothermia; thrombosis, tamponade, tension pneumothorax, toxins'}],
  asys:[
    {n:'Cardiopulmonary resuscitation',cls:'Basic life support',dose:'100–120/min, 30:2; rhythm check every 2 min',first:true,anim:{k:'cpr',t:'Chest compressions'}},
    {n:'Adrenaline',cls:'Vasopressor',dose:'1 mg IV/IO as soon as possible, then every 3–5 min',first:true,anim:IV('Adrenaline 1 mg IV',0xe0523f)},
    {n:'Defibrillation',cls:'Electrical therapy',dose:'—',base:['no','Not a shockable rhythm. Increase the gain and check another lead to exclude fine VF.']},
    {n:'Atropine',cls:'Anticholinergic',dose:'—',base:['no','No longer recommended in asystole/PEA (since ERC 2010).']},
    {n:'Reversible causes (4 Hs and 4 Ts)',cls:'Treat the cause',dose:'Especially hyperkalaemia, hypoxia, hypovolaemia, tamponade'}],
  brady:[atropin(null,'nsr'),tcp,adrInf,causeAV],
  arrest:[atropin(null,'nsr'),tcp,causeAV,ppm(false)],
  mobitz2:[atropin(['warn','Usually ineffective in infranodal block; may bridge to pacing.'],null),tcp,adrInf,ppm(true),causeAV],
  avb3:[atropin(['warn','Usually ineffective in broad-QRS (infranodal) complete block; may be tried with a narrow QRS.'],null),tcp,adrInf,ppm(true),causeAV],
  avb1:[causeAV,{n:'Observation',cls:'Monitoring',dose:'No treatment needed on its own',first:true}],
  wenck:[causeAV,{n:'Observation',cls:'Monitoring',dose:'No treatment if asymptomatic; common and transient in inferior MI',first:true},atropin(null,'nsr')],
  stemi_ant:[],stemi_inf:[],
  hyperk:[
    {n:'Calcium gluconate 10%',cls:'Membrane stabilisation',dose:'30 mL IV over 5–10 min (or CaCl₂ 10% 10 mL); repeat if the ECG does not improve',note:'Does not lower K⁺; first drug if there are ECG changes, acts within minutes.',first:true,anim:IV('IV calcium gluconate',0x9a7b4f),
      res:'The QRS narrowed; potassium is still high, shift it into cells.',rules:[['dig','warn','Give slowly (20–30 min) in a patient on digoxin. The “stone heart” concern rests on weak evidence; give it if needed.']]},
    {n:'Insulin + dextrose',cls:'Shift K⁺ into cells',dose:'10 U short-acting insulin IV + 25 g glucose; hourly blood glucose',first:true,anim:IV('Insulin + dextrose',0x12a36b),next:'nsr',
      rules:[['kbh','warn','High risk of hypoglycaemia: dextrose infusion and hourly glucose.'],['dm','info','If blood glucose is >250 mg/dL, extra dextrose may not be needed.']]},
    {n:'Nebulised salbutamol',cls:'Shift K⁺ into cells',dose:'10–20 mg nebulised',rules:[['bb','info','The effect may be reduced in patients on beta blockers.'],['kah','warn','Can cause tachycardia and ischaemia.']]},
    {n:'Sodium bicarbonate',cls:'Supportive',dose:'Only if there is accompanying metabolic acidosis'},
    {n:'Potassium binder',cls:'Increase excretion',dose:'Sodium zirconium cyclosilicate 10 g three times daily'},
    {n:'Haemodialysis',cls:'Increase excretion',dose:'In refractory hyperkalaemia',rules:[['kbh','info','In advanced kidney disease, plan early dialysis.']]},
    {n:'Stop K⁺-raising drugs',cls:'Treat the cause',dose:'ACEi, ARB, MRA, NSAIDs, trimethoprim',rules:[['acei','info','This patient is on an ACEi/ARB/MRA: stop it.']]}],
  hypok:[
    {n:'IV potassium chloride',cls:'Electrolyte',dose:'≤10 mmol/h peripherally, ≤20 mmol/h centrally; on a monitor',first:true,anim:IV('IV potassium',0x12a36b),next:'nsr',rules:[['kbh','warn','Slowly and with frequent levels in renal failure.']]},
    {n:'Magnesium',cls:'Electrolyte',dose:'2 g IV',note:'Potassium will not rise until hypomagnesaemia is corrected.',first:true,anim:IV('IV magnesium',0x0f6fd6),rules:[['kbh','warn','Risk of hypermagnesaemia.']]},
    {n:'Oral KCl',cls:'Electrolyte',dose:'40–100 mmol/day in divided doses',note:'In mild hypokalaemia.'},
    {n:'Review high-risk drugs',cls:'Treat the cause',dose:'Loop/thiazide diuretics, digoxin, QT-prolonging drugs',rules:[['dig','warn','Hypokalaemia increases digoxin toxicity.'],['qt','warn','The QT is already long: stop the QT-prolonging drug.']]}],
  pe:[
    heparin('80 U/kg IV bolus, 18 U/kg/h infusion (or LMWH 1 mg/kg twice daily)','Started without waiting for the diagnosis if suspicion is high.'),
    {n:'Systemic thrombolysis (alteplase)',cls:'Thrombolytic',dose:'100 mg over 2 hours',note:'In high-risk PE (shock, hypotension).',anim:IV('Alteplase',0xe0523f),next:'nsr',
      base:['warn','Only with haemodynamic instability; not routine in intermediate risk.'],rules:[['inst','info','This patient is unstable: thrombolysis is indicated.'],['kanama','no','Active bleeding: absolute contraindication.'],['inme','warn','History of stroke: review contraindications.']]},
    Object.assign({},doak,{dose:'10 mg twice daily for 7 days, then 5 mg twice daily',note:'Long-term in a stable patient.',calc:null}),
    {n:'Oxygen and cautious fluids',cls:'Supportive',dose:'Oxygen if SpO₂ <90%; avoid aggressive fluids with RV strain'}],
  tamponade:[
    {n:'Pericardiocentesis',cls:'Interventional',dose:'Echo-guided subxiphoid approach',note:'Definitive treatment; urgent in hypotensive tamponade.',first:true,next:'tachy',res:'The pressure fell; pulse and blood pressure are improving.'},
    {n:'IV fluid',cls:'Supportive',dose:'250–500 mL bolus',note:'Supports preload, a bridge to drainage.'},
    {n:'Diuretic / nitrate',cls:'—',dose:'—',base:['no','Reduces preload: can cause circulatory collapse in tamponade.']},
    {n:'Positive-pressure ventilation',cls:'—',dose:'—',base:['warn','Reduces venous return; drain first if possible.']},
    {n:'Stop the anticoagulant',cls:'Treat the cause',dose:'In a haemorrhagic effusion',rules:[['antikoag','warn','The patient is on an anticoagulant: stop it and reverse if needed.']]}],
  peri:[
    {n:'Ibuprofen (or aspirin)',cls:'NSAID',dose:'Ibuprofen 600 mg three times daily for 1–2 weeks (aspirin 750–1000 mg three times daily), with a PPI; taper to stop',first:true,
      rules:[['asa','no','Aspirin/NSAID allergy: colchicine + low-dose corticosteroid.'],['kbh','warn','Impairs renal function.'],['kanama','warn','Risk of GI bleeding.'],['antikoag','warn','Bleeding risk rises with an anticoagulant.'],['gebe','warn','Avoid NSAIDs after 20 weeks.'],['hfref','warn','Causes fluid retention in HF.']]},
    {n:'Colchicine',cls:'Anti-inflammatory',dose:'0.5 mg twice daily (<70 kg: once daily) for 3 months',note:'Halves recurrence.',first:true,
      rules:[['kbh','warn','Reduce the dose or avoid in renal failure.'],['kc','warn','Caution in liver failure.']],calc:P=>P.kilo&&P.kilo<70?['info','This patient is <70 kg: 0.5 mg once daily.']:null},
    {n:'Corticosteroid',cls:'Second line',dose:'Prednisone 0.2–0.5 mg/kg/day',note:'If NSAIDs cannot be given or in autoimmune causes; may increase recurrence.'}],
  tachy:[{n:'Treat the cause',cls:'Treat the cause',dose:'Pain, fever, hypovolaemia, anaemia, hypoxia, thyrotoxicosis, PE',first:true},
    {n:'Rate-lowering drug',cls:'Beta blocker',dose:'—',base:['warn','Suppressing a compensatory sinus tachycardia can be dangerous; look for the cause.']}],
  pvc:[{n:'Reassurance and triggers',cls:'Monitoring',dose:'Caffeine, alcohol, sleep deprivation, electrolytes',first:true},
    Object.assign({},bbIV,{dose:'Oral metoprolol 25–100 mg/day',note:'For symptomatic ventricular ectopics.'}),
    {n:'Catheter ablation',cls:'Interventional',dose:'With an ectopic burden >10–15% or ectopy-induced HF'}],
  nsr:[{n:'No treatment needed',cls:'—',dose:'Normal rhythm',first:true}],
  rbbb:[{n:'No treatment needed on its own',cls:'Monitoring',dose:'New RBBB + breathlessness: think of PE',first:true}],
  lbbb:[{n:'Investigate the underlying disease',cls:'Monitoring',dose:'Echo; with new LBBB + ischaemic pain, Sgarbossa and a STEMI-equivalent approach',first:true},
    {n:'Cardiac resynchronisation (CRT)',cls:'Device',dose:'In symptomatic HF with LBBB, QRS ≥150 ms and EF ≤35%',rules:[['hfref','info','This patient has HF: assess eligibility for CRT.']]}],
  paced:[{n:'Device check',cls:'Monitoring',dose:'Capture, sensing, battery life',first:true}]
};
const stemi=inf=>[
  {n:'Primary PCI',cls:'Reperfusion',dose:'Within ≤120 min of diagnosis (target ≤90 min); radial access',note:'The preferred reperfusion in STEMI.',first:true,anim:{k:'pci',t:'Primary PCI: balloon and stent'},next:'nsr',res:'The artery is open and the ST segment is resolving.',
    rules:[['kontrast','warn','Contrast allergy: steroid + antihistamine premedication; do not delay PCI.'],['kbh','warn','Contrast nephropathy: limit contrast volume, hydrate.']]},
  asa('150–300 mg chewed (or 75–250 mg IV)'),
  {n:'Ticagrelor',cls:'P2Y12 inhibitor',dose:'180 mg load, then 90 mg twice daily',first:true,
    rules:[['kanama','no','Active bleeding.'],['antikoag','warn','In a patient on an OAC, use clopidogrel instead of ticagrelor.'],['kc','warn','Contraindicated in moderate-severe liver failure.'],['inme','info','Contraindicated with a history of haemorrhagic stroke.']]},
  {n:'Prasugrel',cls:'P2Y12 inhibitor',dose:'60 mg load (at PCI), then 10 mg/day',
    rules:[['inme','no','Contraindicated with a history of stroke/TIA.'],['kanama','no','Active bleeding.'],['antikoag','warn','Not recommended together with an OAC.']],
    calc:P=>(P.yas>=75||(P.kilo&&P.kilo<60))?['warn','Age ≥75 or <60 kg: generally not recommended; if given, 5 mg maintenance.']:null},
  {n:'Clopidogrel',cls:'P2Y12 inhibitor',dose:'600 mg load, then 75 mg/day',note:'In patients on an OAC, or if a potent P2Y12 cannot be given.',rules:[['antikoag','info','The preferred P2Y12 in a patient on an OAC.']]},
  heparin('70–100 U/kg IV bolus (during PCI)','Routine anticoagulation during PCI.'),
  fibrin,
  nitrat(inf?['warn','In inferior MI with right ventricular involvement (ST elevation in V4R) the heart is preload-dependent: do not give.']:null),
  Object.assign({},bbIV,{note:'For pain, tachycardia or hypertension if there are no signs of HF.',rules:bbIV.rules.concat([['hfref','no','Not given with signs of acute HF.']])}),
  {n:'Oxygen',cls:'Supportive',dose:'Only if SpO₂ <90%',note:'Routine oxygen gives no benefit in normoxaemia.'},
  {n:'Opioid (morphine)',cls:'Analgesia',dose:'2–4 mg IV titrated',base:['info','Delays oral P2Y12 absorption; only for refractory pain.']}
].concat(inf?[{n:'IV fluid',cls:'Supportive',dose:'250–500 mL bolus',note:'Supports preload in hypotension due to right ventricular infarction.',rules:[['hfref','warn','Caution in HF; watch for pulmonary congestion.']]}]:[]);
RX.stemi_ant=stemi(false); RX.stemi_inf=stemi(true);

const LV={ok:0,info:1,warn:2,no:3};
function evalRx(cond,P){
  return (RX[cond]||[]).map((r,i)=>{
    const why=[]; if(r.base&&r.base[1]) why.push(r.base);
    for(const [k,l,w] of r.rules||[]){ const neg=k[0]==='!', key=neg?k.slice(1):k; if(neg!==P.sel.has(key)) why.push([l,w,key]); }
    if(r.calc){ const c=r.calc(P); if(c) why.push(c); }
    let st=r.base?r.base[0]:'ok'; for(const [l] of why) if(LV[l]>LV[st]) st=l;
    return Object.assign({},r,{i,st,why});
  });
}
window.KalpI18n&&window.KalpI18n.add({HASTA,HASTA_ALL:{$replace:1,...ALL},RX:Object.assign({$replace:1},RX),evalRx});
})();
