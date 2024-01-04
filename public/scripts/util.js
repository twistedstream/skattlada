function displayError(err) {
  const message = err.message || err.errorMessage || err;

  window.alert(message);
}

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}
