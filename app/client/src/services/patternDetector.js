export function detectPatterns(entities) {
  const alerts = [];

  const personMap = {};
  const locationMap = {};
  const lawMap = {};

  entities.forEach(e => {
    // Handling e.type or e.label depending on how it's passed from NER output
    const type = e.type || e.label;
    if (type === 'PERSON') personMap[e.text] = (personMap[e.text] || 0) + 1;
    if (type === 'LOCATION') locationMap[e.text] = (locationMap[e.text] || 0) + 1;
    if (type === 'LAW_SECTION') lawMap[e.text] = (lawMap[e.text] || 0) + 1;
  });

  Object.entries(personMap).forEach(([name, count]) => {
    if (count > 1) alerts.push({ type: 'warning', message: `"${name}" appears ${count} times in this document.`, entity: name });
  });

  const SERIOUS_SECTIONS = ['302', '376', '420', '498', '307', '120B', '34'];
  entities.filter(e => {
    const type = e.type || e.label;
    return type === 'LAW_SECTION';
  }).forEach(e => {
    const sectionNum = e.text.replace(/[^0-9A-Z]/gi, '');
    if (SERIOUS_SECTIONS.some(s => sectionNum.includes(s))) {
      alerts.push({ type: 'danger', message: `Serious IPC section detected: ${e.text}. This carries significant legal consequences.`, entity: e.text });
    }
  });

  const moneyEntities = entities.filter(e => (e.type || e.label) === 'MONEY');
  if (moneyEntities.length > 1) {
    alerts.push({ type: 'info', message: `${moneyEntities.length} monetary amounts found. Review for consistency.`, entity: null });
  }

  const dates = entities.filter(e => (e.type || e.label) === 'DATE');
  if (dates.length > 2) {
    alerts.push({ type: 'info', message: `${dates.length} dates detected. Verify chronological order.`, entity: null });
  }

  return alerts;
}
