import type { NextApiRequest, NextApiResponse } from "next";

const KRATOS_URL = "https://kratos-test.up.railway.app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Метод не разрешен" });
  }

  try {
    const url = `${KRATOS_URL}/sessions/whoami`;

    const requestHeaders: HeadersInit = {
      Accept: "application/json",
    };

    if (req.headers.cookie) {
      requestHeaders["Cookie"] = req.headers.cookie;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: requestHeaders,
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { message: "Не удалось обработать ответ" };
    }

    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      res.setHeader("Set-Cookie", setCookieHeader);
    }

    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
