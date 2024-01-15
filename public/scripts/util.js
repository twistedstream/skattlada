function displayError(err) {
  const message = err.message || err.errorMessage || err;

  window.alert(message);
}

function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function displayInvalidFeedback(field, message) {
  field.classList.add("is-invalid");
  const feedbackElement = document.createElement("div");
  feedbackElement.classList.add("invalid-feedback", "mb-2");
  feedbackElement.innerText = message;
  field.parentElement.appendChild(feedbackElement);
}

function displayValidFeedback(field) {
  field.classList.add("is-valid");
}

function clearValidationFeedback(field) {
  field.classList.remove("is-invalid");
  field.classList.remove("is-valid");
  const feedbackElement =
    field.parentElement.querySelector(".invalid-feedback");
  if (feedbackElement) {
    feedbackElement.remove();
  }
}
