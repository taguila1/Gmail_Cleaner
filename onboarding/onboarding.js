// Onboarding page script

document.addEventListener('DOMContentLoaded', () => {
  const btnGetStarted = document.getElementById('btn-get-started');
  const btnSkip = document.getElementById('btn-skip');
  const linkSettings = document.getElementById('link-settings');
  
  // Mark onboarding as completed
  function completeOnboarding() {
    chrome.storage.local.set({ onboardingCompleted: true }, () => {
      // Close the onboarding tab
      chrome.tabs.getCurrent((tab) => {
        if (tab) {
          chrome.tabs.remove(tab.id);
        }
      });
    });
  }
  
  btnGetStarted.addEventListener('click', () => {
    // Open Gmail in a new tab
    chrome.tabs.create({ url: 'https://mail.google.com' }, () => {
      completeOnboarding();
    });
  });
  
  // Use chrome.runtime.getURL for proper extension resource paths
  const logoImg = document.querySelector('.logo img');
  if (logoImg) {
    logoImg.src = chrome.runtime.getURL('assets/icons/icon128.png');
  }
  
  btnSkip.addEventListener('click', () => {
    completeOnboarding();
  });
  
  linkSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    completeOnboarding();
  });
});

