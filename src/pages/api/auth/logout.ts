import type { NextApiRequest, NextApiResponse } from "next";

const KRATOS_URL = "https://kratos-test.up.railway.app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Метод не разрешен" });
  }

  try {
    const logoutFlowUrl = `${KRATOS_URL}/self-service/logout/browser`;

    const requestHeaders: HeadersInit = {
      Accept: "application/json",
    };

    if (req.headers.cookie) {
      requestHeaders["Cookie"] = req.headers.cookie;
    }

    const flowResponse = await fetch(logoutFlowUrl, {
      method: "GET",
      headers: requestHeaders,
    });

    if (!flowResponse.ok) {
      return res
        .status(flowResponse.status)
        .json({ error: "Не удалось получить ссылку для выхода" });
    }

    const flowData = await flowResponse.json();

    if (!flowData.logout_url) {
      return res
        .status(400)
        .json({ error: "Не удалось получить ссылку для выхода" });
    }

    const logoutResponse = await fetch(flowData.logout_url, {
      method: "GET",
      headers: requestHeaders,
      redirect: "manual",
    });

    const setCookieHeader = logoutResponse.headers.get("set-cookie");
    if (setCookieHeader) {
      res.setHeader("Set-Cookie", setCookieHeader);
    }

    return res
      .status(200)
      .json({ success: true, message: "Выход выполнен успешно" });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
