export function renderTrustDots(level) {
  let html = '<div class="trust-level">';
  for (let i = 0; i < 5; i++) {
    html += `<div class="trust-dot ${i < level ? 'active' : ''}"></div>`;
  }
  html += '</div>';
  return html;
}