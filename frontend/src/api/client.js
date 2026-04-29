const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path, options = {}, attempt = 0) => {
  const token = localStorage.getItem("fitclash-token");
  const includeAuth = options.includeAuth !== false;
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  delete options.includeAuth;

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers,
      ...options
    });
  } catch (error) {
    if (attempt < 1) {
      await sleep(1500);
      return request(path, options, attempt + 1);
    }

    throw new Error("Backend is unreachable right now. Retry in a few seconds.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
};

export const api = {
  get: (path, options = {}) =>
    request(path, {
      cache: "no-store",
      ...options
    }),
  post: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body)
    }),
  patch: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  delete: (path, options = {}) =>
    request(path, {
      ...options,
      method: "DELETE"
    })
};
