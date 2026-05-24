async function apiRequest(endpoint, options) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options || {});
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok || data.success === false) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The server returned an invalid response.");
    }

    throw new Error(error.message || "Unable to connect to the API.");
  }
}

async function apiGet(endpoint, options) {
  return apiRequest(endpoint, {
    method: "GET",
    headers: options && options.headers ? options.headers : {}
  });
}

async function apiPost(endpoint, body, options) {
  return apiRequest(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    },
    body: JSON.stringify(body || {})
  });
}

async function apiPut(endpoint, body, options) {
  return apiRequest(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    },
    body: JSON.stringify(body || {})
  });
}

async function apiDelete(endpoint, options) {
  return apiRequest(endpoint, {
    method: "DELETE",
    headers: options && options.headers ? options.headers : {}
  });
}

