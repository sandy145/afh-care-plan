// The WA DSHS Adult Family Home Negotiated Care Plan, as data.
// Column 1 = the section's own fields; column 2 = Resident strengths / prefers to do independently;
// column 3 = What provider/caregiver/support person does, when & how.

export type FieldType = "text" | "yesno" | "assist" | "checklist";

export interface TemplateField {
  id: string;
  label: string;
  column: 1 | 2 | 3;
  type?: FieldType;
}

export interface TemplateSection {
  id: string;
  title: string;
  area: "INFO" | "HEALTH" | "PSYCH" | "ADL" | "IADL" | "ADMIN";
  hasAssistLevel?: boolean;
  fields: TemplateField[];
}

const strengths = (sid: string): TemplateField => ({
  id: `${sid}.strengths`,
  label: "Resident strengths / what resident prefers to do independently",
  column: 2,
});
const caregiver = (sid: string): TemplateField => ({
  id: `${sid}.caregiver`,
  label: "What provider/caregiver/support person does, when & how",
  column: 3,
});
const assist = (sid: string): TemplateField => ({
  id: `${sid}.level`,
  label: "Level of assistance",
  column: 1,
  type: "assist",
});
const t = (sid: string, key: string, label: string, type: FieldType = "text"): TemplateField => ({
  id: `${sid}.${key}`,
  label,
  column: 1,
  type,
});

export const NCP_TEMPLATE: TemplateSection[] = [
  {
    id: "info",
    title: "RESIDENT INFORMATION",
    area: "INFO",
    hasAssistLevel: false,
    fields: [
      t("info", "primary_language", "Primary language"),
      t("info", "interested_party", "Name & address of interested party (guardian, POA, family)"),
      t("info", "interested_party_phone", "Interested party phone"),
      t("info", "physician", "Physician or medical group (name, phone, fax)"),
      t("info", "pharmacy", "Pharmacy (name, phone, fax)"),
      t("info", "dentist", "Dentist (name, phone, fax)"),
      t("info", "advance_directive", "Advance directive (type)"),
      t("info", "legal_documents", "Legal documents (type)"),
      t("info", "medical_status", "Current medical status"),
      t("info", "medical_history", "Medical history"),
      t("info", "specialty_needs", "Specialty needs: dementia / mental health / developmental disability"),
      t("info", "evacuation", "Emergency evacuation: independent or assistance required"),
      t("info", "evacuation_instructions", "Evacuation special instructions"),
    ],
  },
  {
    id: "communication",
    title: "COMMUNICATION: SPEECH/HEARING/VISION",
    area: "HEALTH",
    hasAssistLevel: false,
    fields: [
      t("communication", "speech", "Problems with speech — describe"),
      t("communication", "hearing", "Hearing problems — describe / aid"),
      t("communication", "vision", "Visual problems — describe / aid"),
      t("communication", "telephone", "Telephone use"),
      t("communication", "language", "Language"),
      strengths("communication"),
      caregiver("communication"),
    ],
  },
  {
    id: "medications",
    title: "MEDICATION MANAGEMENT",
    area: "HEALTH",
    hasAssistLevel: false,
    fields: [
      t("medications", "self_admin", "Self administration (routes)"),
      t("medications", "with_assistance", "Self medication with assistance (routes, organizer, equipment)"),
      t("medications", "administration", "Administration (nurse delegated?, routes, equipment)"),
      t("medications", "injections", "Injections (surrogate / family / licensed professional)"),
      t("medications", "away_plan", "Medication plan when resident not in home"),
      strengths("medications"),
      caregiver("medications"),
    ],
  },
  {
    id: "treatment",
    title: "TREATMENT/PROGRAMS/THERAPIES",
    area: "HEALTH",
    hasAssistLevel: false,
    fields: [
      t("treatment", "hospice", "Hospice"),
      t("treatment", "therapies", "Treatments, programs, therapies"),
      t("treatment", "oxygen", "Oxygen use"),
      t("treatment", "pain", "Pain"),
      t("treatment", "weight", "Weight loss/gain"),
      t("treatment", "programs", "Programs attended (e.g. adult day health)"),
      t("treatment", "rn_delegation", "RN delegation — tasks, consent"),
      t("treatment", "enablers", "Physical enablers"),
      strengths("treatment"),
      caregiver("treatment"),
    ],
  },
  {
    id: "psych",
    title: "PSYCH/SOCIAL/COGNITIVE STATUS",
    area: "PSYCH",
    hasAssistLevel: false,
    fields: [
      t("psych", "behaviors", "Behaviors (sleep, memory, decision making, disruptive, assaultive, resistive, depression, anxiety, disorientation, wandering, exit seeking, hallucinations, delusions, other)", "checklist"),
      t("psych", "describe", "Describe behaviors — be specific"),
      t("psych", "interventions", "Non-medication (behavioral/environmental) interventions"),
      t("psych", "psychopharm", "Psychopharmacological medications — symptoms per medication"),
      t("psych", "crisis_plan", "Behavioral Health Support Crisis Plan"),
      t("psych", "mhp", "Counseling / Mental Health Provider"),
      t("psych", "programs", "DSHS Specialized Behavioral Programs"),
      t("psych", "typical_day", "Narrative — what does a typical day look like"),
      strengths("psych"),
      caregiver("psych"),
    ],
  },
  {
    id: "left_alone",
    title: "LEFT ALONE",
    area: "PSYCH",
    hasAssistLevel: false,
    fields: [t("left_alone", "can_be_left_alone", "Can be left alone", "yesno"), strengths("left_alone"), caregiver("left_alone")],
  },
  {
    id: "precautions",
    title: "UNIVERSAL PRECAUTIONS",
    area: "HEALTH",
    hasAssistLevel: false,
    fields: [t("precautions", "notes", "Mask / sanitizer / immunizations / shared equipment / other"), strengths("precautions"), caregiver("precautions")],
  },
  {
    id: "mobility",
    title: "AMBULATION/MOBILITY",
    area: "ADL",
    fields: [
      assist("mobility"),
      t("mobility", "outside", "Outside of immediate living environment"),
      t("mobility", "falls_risk", "Risk for falls"),
      t("mobility", "fall_plan", "Fall prevention plan"),
      t("mobility", "equipment", "Equipment / vendor"),
      t("mobility", "preferences", "Preferences / choices"),
      strengths("mobility"),
      caregiver("mobility"),
    ],
  },
  {
    id: "bed_mobility",
    title: "BED MOBILITY/TRANSFER",
    area: "ADL",
    fields: [
      assist("bed_mobility"),
      t("bed_mobility", "skin_care", "Skin care due to inability to position self"),
      t("bed_mobility", "turning", "Turning and repositioning — frequency"),
      t("bed_mobility", "equipment", "Equipment / supplies"),
      t("bed_mobility", "falls_risk", "Risk for falls"),
      t("bed_mobility", "enablers", "Enablers (Hoyer lift, transfer pole, other)"),
      t("bed_mobility", "safety", "Safety assessment, alternatives explored; how to keep resident safe"),
      t("bed_mobility", "night", "Night time care needs"),
      t("bed_mobility", "preferences", "Preferences"),
      strengths("bed_mobility"),
      caregiver("bed_mobility"),
    ],
  },
  {
    id: "eating",
    title: "EATING",
    area: "ADL",
    fields: [
      assist("eating"),
      t("eating", "diet", "Special diet / supplements"),
      t("eating", "habits", "Eating habits"),
      t("eating", "allergies", "Food allergies"),
      t("eating", "equipment", "Preferences / equipment"),
      t("eating", "limitations", "Limitations"),
      strengths("eating"),
      caregiver("eating"),
    ],
  },
  {
    id: "toileting",
    title: "TOILETING/CONTINENCE ISSUES",
    area: "ADL",
    fields: [
      assist("toileting"),
      t("toileting", "bladder", "Bladder incontinence (yes / no / occasional)"),
      t("toileting", "bowel", "Bowel incontinence (yes / no / occasional)"),
      t("toileting", "skin_care", "Skin care due to bowel/bladder incontinence"),
      t("toileting", "equipment", "Equipment"),
      t("toileting", "preferences", "Preferences"),
      strengths("toileting"),
      caregiver("toileting"),
    ],
  },
  {
    id: "dressing",
    title: "DRESSING",
    area: "ADL",
    fields: [assist("dressing"), t("dressing", "equipment", "Equipment"), t("dressing", "preferences", "Preferences"), strengths("dressing"), caregiver("dressing")],
  },
  {
    id: "hygiene",
    title: "PERSONAL HYGIENE",
    area: "ADL",
    fields: [
      assist("hygiene"),
      t("hygiene", "oral", "Oral hygiene, including dentures"),
      t("hygiene", "when", "When and how often"),
      t("hygiene", "preferences", "Preferences"),
      strengths("hygiene"),
      caregiver("hygiene"),
    ],
  },
  {
    id: "bathing",
    title: "BATHING",
    area: "ADL",
    fields: [
      assist("bathing"),
      t("bathing", "how_often", "How often"),
      t("bathing", "when", "When"),
      t("bathing", "equipment", "Equipment"),
      t("bathing", "preferences", "Preferences"),
      strengths("bathing"),
      caregiver("bathing"),
    ],
  },
  {
    id: "body_care",
    title: "BODY CARE",
    area: "ADL",
    fields: [
      assist("body_care"),
      t("body_care", "foot_care", "Foot care"),
      t("body_care", "skin_care", "Skin care — how often"),
      t("body_care", "skin_problems", "Skin problems — describe"),
      t("body_care", "dressing_changes", "Dressing changes (nurse delegated?)"),
      t("body_care", "preferences", "Preferences"),
      strengths("body_care"),
      caregiver("body_care"),
    ],
  },
  {
    id: "finances",
    title: "MANAGING FINANCES",
    area: "IADL",
    fields: [assist("finances"), t("finances", "who", "Who manages finances"), t("finances", "records", "Financial records"), t("finances", "preferences", "Preferences"), strengths("finances"), caregiver("finances")],
  },
  {
    id: "shopping",
    title: "SHOPPING",
    area: "IADL",
    fields: [assist("shopping"), t("shopping", "transport", "Special transportation needs"), t("shopping", "how_often", "How often"), t("shopping", "preferences", "Preferences"), strengths("shopping"), caregiver("shopping")],
  },
  {
    id: "transportation",
    title: "TRANSPORTATION",
    area: "IADL",
    fields: [
      assist("transportation"),
      t("transportation", "medical", "Medical services"),
      t("transportation", "special", "Special transportation needs"),
      t("transportation", "equipment", "Equipment"),
      t("transportation", "how_often", "How often"),
      t("transportation", "preferences", "Preferences"),
      strengths("transportation"),
      caregiver("transportation"),
    ],
  },
  {
    id: "activities",
    title: "ACTIVITIES/SOCIAL NEEDS",
    area: "IADL",
    fields: [
      assist("activities"),
      t("activities", "interests", "Interests / activities / religious activities"),
      t("activities", "traditions", "Social / cultural traditions / preferences"),
      t("activities", "family", "Family / friends / relationships"),
      t("activities", "employment", "Employment support"),
      t("activities", "clubs", "Clubs / groups / day health"),
      t("activities", "emergency_numbers", "Emergency numbers provided"),
      t("activities", "arrangements", "Special arrangements"),
      t("activities", "participation", "Participation issues"),
      strengths("activities"),
      caregiver("activities"),
    ],
  },
  {
    id: "smoking",
    title: "SMOKING",
    area: "IADL",
    hasAssistLevel: false,
    fields: [t("smoking", "smokes", "Smokes", "yesno"), t("smoking", "safety", "Safety concerns / storage of cigarettes and lighter"), t("smoking", "preferences", "Preferences"), strengths("smoking"), caregiver("smoking")],
  },
  {
    id: "case_management",
    title: "CASE MANAGEMENT",
    area: "ADMIN",
    hasAssistLevel: false,
    fields: [t("case_management", "cm", "Case manager (name, agency, phone, email, fax)"), caregiver("case_management")],
  },
  {
    id: "other",
    title: "OTHER ISSUES/CONCERNS/PROBLEMS",
    area: "ADMIN",
    hasAssistLevel: false,
    fields: [t("other", "issues", "Other issues / concerns / problems"), caregiver("other")],
  },
];

export const ASSIST_LABELS: Record<string, string> = {
  independent: "Independent",
  supervision: "Supervision/Cueing",
  assistance: "Assistance Needed",
  dependent: "Totally Dependent",
};

export function sectionOf(fieldId: string) {
  return NCP_TEMPLATE.find((s) => s.id === fieldId.split(".")[0]);
}
export function fieldOf(fieldId: string) {
  return sectionOf(fieldId)?.fields.find((f) => f.id === fieldId);
}
