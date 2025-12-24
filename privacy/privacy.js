// Privacy policy page script

document.addEventListener('DOMContentLoaded', () => {
  const lastUpdatedElement = document.getElementById('last-updated-date');
  if (lastUpdatedElement) {
    lastUpdatedElement.textContent = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
});

