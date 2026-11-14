/* Present the existing entitlement without changing access or payment behavior. */
(() => {
  const status = document.getElementById('sidebarSubscriptionStatus');
  const hint = document.getElementById('sidebarSubscriptionHint');
  if (!status || !hint) return;
  function render() {
    const access = window.GESPascoAccess;
    const state = access?.state() || {kind:'unverified'};
    const ends = Number(state.expiresAtMs);
    if (state.kind === 'administrator') {
      status.textContent = 'Administrator access';
      hint.textContent = 'All chapters and practice sets are available.';
    } else if (state.kind === 'full-grant' && state.fullAccess) {
      status.textContent = 'Complimentary full access';
      hint.textContent = 'Your reading grant unlocks every chapter and practice set.';
    } else if (state.kind === 'subscription' && ends > Date.now()) {
      status.textContent = 'Active subscription';
      hint.textContent = access.fullAccess()
        ? 'Ends ' + new Date(ends).toLocaleDateString() + ' · All chapters and practice sets.'
        : 'Manage devices in Account to start full reading here.';
    } else if (state.kind === 'trial') {
      status.textContent = 'Three-day sample trial';
      hint.textContent = 'Subscribe to unlock every chapter and practice set.';
    } else if (state.kind === 'suspended') {
      status.textContent = 'Account suspended';
      hint.textContent = 'Contact support about your account access.';
    } else if (state.kind === 'unverified') {
      status.textContent = 'Checking account access…';
      hint.textContent = 'Connect to verify your saved account access.';
    } else {
      status.textContent = 'Free sample access';
      hint.textContent = 'Subscribe to unlock every chapter and practice set.';
    }
  }
  window.addEventListener('ges-pasco-access-updated', render);
  render();
})();
