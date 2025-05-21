import type { NextApiRequest, NextApiResponse } from "next";

const KRATOS_URL = "https://kratos-test.up.railway.app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Входящий запрос submit-flow:", {
    method: req.method,
    url: req.url,
    query: req.query,
    cookies: req.headers.cookie ? "Присутствуют" : "Отсутствуют",
  });

  console.log("cookies", req.headers.cookie);
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { flowId, actionType, formData } = req.body;

    const csrfToken = formData?.csrf_token;

    if (!flowId || !actionType || !formData) {
      console.error("Ошибка валидации:", { flowId, actionType, formData });
      return res.status(400).json({
        error: "Отсутствуют обязательные поля",
        received: { flowId, actionType, formData },
      });
    }

    console.log("Отправка запроса на Kratos:", {
      url: `${KRATOS_URL}/self-service/${actionType}?flow=${flowId}`,
      data: formData,
    });

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (req.headers.cookie) {
      headers["Cookie"] = req.headers.cookie;
    }

    console.log("csrf token", csrfToken);
    console.log("request cookies", headers["Cookie"]);

    const response = await fetch(
      `${KRATOS_URL}/self-service/${actionType}?flow=${flowId}`,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(formData),
      }
    );

    console.log("Ответ от Kratos:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseText = await response.text();
    console.log("Ответ от Kratos (текст):", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Распарсенный JSON:", responseData);
    } catch (e) {
      console.error("Ошибка парсинга JSON:", e);
      return res.status(response.status).send(responseText);
    }

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("Set-Cookie", setCookie);
    }

    return res.status(response.status).json(responseData);
  } catch (error) {
    console.error("Ошибка API:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
