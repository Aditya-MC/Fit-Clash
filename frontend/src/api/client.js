const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path, options = {}, attempt = 0) => {
  const token = localStorage.getItem("fitclash-token");

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
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
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body)
    })
};
