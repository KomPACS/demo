# Glossary

Shared terms for humans and agents. One meaning per term. Add a term when the team agrees on it.

## Clinical

| Term | Meaning | Czech (UI) |
|---|---|---|
| MDT | Multidisciplinary team meeting (tumor board). Specialists decide cancer treatment together. | MDT, indikační seminář |
| Exam | One imaging examination of a patient, as recorded in NIS. Its images in PACS form a Study. Avoid: screening. | vyšetření |
| Scheduled exam | A planned CT, MRI or PET scan. One of the two triggers. | plánované vyšetření |
| Trigger | The event that starts a check: a scheduled exam or a patient put on an MDT list. | spouštěč |
| Prior | An earlier imaging exam of the same patient. | předchozí vyšetření |
| Candidate prior | A prior found in NIS, named in a report, or known to the insurer, before the relevance verdict. | kandidátní předchozí vyšetření |
| Relevant prior | A prior the physician needs to compare against for the current exam or MDT. | relevantní předchozí vyšetření |
| Baseline | The prior taken before treatment started. Used to measure response. | vstupní vyšetření |
| Comparison | Reading a new exam against priors to see change (growth, shrinkage, new lesions). | srovnání |
| Index date | Date of the first record of the patient's cancer. The lookback window starts from it. | datum prvozáchytu |
| Case summary | Our output: patient context, list of relevant priors, their status, missing items, next steps. | souhrn případu |
| Report | Text written by a physician. Radiology report = the text reading of an exam. | zpráva, popis |
| Oncology patient | A patient in active cancer treatment. The NIS data covers them. | onkologický pacient |
| Ordering person | The person who orders the exam or starts the check: a physician, the Collector or an MDT member. | indikující osoba |

## Workflow

| Term | Meaning | Czech (UI) |
|---|---|---|
| Doctor | Anyone who reads the case summary: physician, nurse, MDT member. | lékař |
| Collector | The person who works the queue: decides priors, approves requests, makes calls. Sees everything. | koordinátor/ka |
| Queue | The Collector's list of open requests and alerts. | fronta |
| Request | One ask to get missing images or a missing report, by e-mail, phone or FHIR. | žádost |
| Insurer request | The FHIR `Task` that asks the insurer for all procedures of the patient since the index date. Generated per case, not sent. | dotaz na pojišťovnu |
| Relevance verdict | The LLM's label for a candidate prior: relevant, not relevant or uncertain, with a reason and the source sentence. | relevantní / nerelevantní / nejisté |
| Prior status | Available (images and report), missing report (images, no report), missing (no images, place known) or place unknown. | dostupné / chybí popis / chybí / místo neznámé |
| Removed prior | A prior the Collector removed from the request list, with an optional reason. The Doctor sees it and can request it again. | vyřazeno koordinátorem |
| Duplicate alert | Warning that the scheduled exam repeats the same exam within 6 weeks. | upozornění na duplicitu |
| Verified contact | An e-mail or phone of another hospital that the Collector confirmed, with the date. | ověřený kontakt |
| Insurer | Any health insurer. Knows where and when each billed exam was done. | zdravotní pojišťovna |
| Approved request | A request whose channel, recipient and text the Collector reviewed. Only approved requests are sent. | schváleno |
| Home hospital | The hospital that runs KomPACS. Its PACS is "our PACS"; priors from elsewhere arrive via ePACS. | domovská nemocnice |
| Read-only view | The phone layout: walkthrough only, every write action disabled. | jen prohlížení |
| Not delivered | A request whose prior is not in PACS 2 working days after it was sent. | nedoručeno |
| Not found | A place-unknown request the Collector closed without finding the place. | nedohledáno |
| Timeline | All events of one patient in date order. | časová osa |


## AI evidence

| Term | Meaning | Czech (UI) |
|---|---|---|
| Evidence panel | The side panel that shows why the AI judged a prior: source sentence in context, event status, sources and steps. | souhrn úvah |
| Event status | Whether a mentioned exam happened, is planned, is recommended or is unclear. Only a done exam can be a prior. | proběhlo / plánováno / doporučeno / nejasné |
| Deciding word | The word in the source sentence that sets the event status. | rozhodlo slovo |
| Lookup step | A repeatable data lookup (PACS, reports, dates), shown with the time it read the data. | krok Systém |
| AI step | A step where the model reads and interprets text. | krok AI |
| Dispute | The Collector's objection to a verdict: an error category, an evidence note, a re-judge and a choice between v1 and v2. | námitka |
## Imaging

| Term | Meaning |
|---|---|
| CT | Computed tomography. |
| MRI | Magnetic resonance imaging. Czech: *MR*. |
| PET | Positron emission tomography. Often PET/CT. |
| Modality | The imaging technique (CT, MR, PT, US, ...). DICOM code. |
| Study | One imaging exam. Has a unique Study Instance UID. |
| Series | One image set inside a study (e.g. one contrast phase). |
| Accession number | Hospital ID for an ordered exam. Links the order, the study and the report. |
| AE title | DICOM Application Entity title. ePACS identifies a facility by it, e.g. `vfn.cz`. |
| DICOM | Standard format and network protocol for medical images. |
| PACS | Picture archiving and communication system. Stores and serves DICOM. |
| ePACS | Czech network for exchanging images between hospitals. Not in our dataset. |
| Placer order number | The ordering system's ID for an order. HL7 ORC-2. In FHIR: `ServiceRequest.identifier` of type `PLAC`. |
| C-FIND / C-MOVE | DICOM query / DICOM retrieve. |
| QIDO-RS / WADO-RS | DICOMweb (HTTP) query / retrieve. |

## Hospital IT

| Term | Meaning |
|---|---|
| NIS | *Nemocniční informační systém* = hospital information system (HIS). |
| RIS | Radiology information system. Holds orders and schedules. Part of NIS at our partner hospitals. |
| FN Motol | *Fakultní nemocnice v Motole*. Challenge partner. |
| Homolka | *Nemocnice Na Homolce*. Challenge partner. |
| VZP | *Všeobecná zdravotní pojišťovna*. Largest Czech health insurer. Judges come from it. |

## Standards and platform

| Term | Meaning |
|---|---|
| FHIR | HL7 standard for health data exchange. REST + JSON. We use R4. |
| HL7 v2 | Older pipe-delimited message standard. Common in Czech hospitals. |
| ORM^O01 | HL7 v2 order message. Our scheduled exams arrive as ORM^O01. |
| CDA | HL7 XML clinical document standard. |
| SDA | InterSystems internal pivot format. IRIS converts HL7 v2 / CDA → SDA → FHIR. |
| IRIS for Health | InterSystems data platform with a FHIR server and interoperability. See [docs/references/intersystems.md](docs/references/intersystems.md). |
| Production | IRIS interoperability pipeline: business services (in), processes (logic), operations (out). |
| FHIR SQL Builder | IRIS tool that projects FHIR resources into SQL tables. Our schema: `pacs`. |
| Projection | The SQL tables that FHIR SQL Builder makes from FHIR. Live: FHIR writes show at once. |
| Embedding | A vector of numbers that holds the meaning of a text. Similar texts have close vectors. |
| MCP | Model Context Protocol. Lets an LLM client call our tools. Our server: `mcp/` (`pacs-mcp`). |
| Vector search | Find the texts whose embeddings are closest to the query's, with `VECTOR_COSINE` in IRIS SQL. |

## FHIR resources we expect to use

| Resource | Use |
|---|---|
| `Patient` | The patient. |
| `ServiceRequest` / `Appointment` | The scheduled exam (trigger). |
| `DiagnosticReport` | A report, including radiology reports. |
| `ImagingStudy` | A study and its series. Our PACS availability record. |
| `Observation` | Lab results. |
| `Procedure`, `MedicationStatement` | Procedures and medications. |
| `Task` | A follow-up action, e.g. "request priors from hospital X". |
| `Endpoint` | A hospital's FHIR address. Its presence selects the FHIR request channel. |
| `Composition` | The case summary document. |
