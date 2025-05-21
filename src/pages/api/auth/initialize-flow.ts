import type { NextApiRequest, NextApiResponse } from "next";

const KRATOS_URL = "https://kratos-test.up.railway.app";

/**
 * Убирает домен из куков Domain=...
 */
function stripDomain(setCookie: string): string {
  return setCookie
    .split(";")
    .filter((part) => !part.trim().toLowerCase().startsWith("domain="))
    .join(";")
    .trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Входящий запрос initialize-flow:", {
    method: req.method,
    url: req.url,
    query: req.query,
    hasCookie: Boolean(req.headers.cookie),
  });

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Метод не разрешен" });
  }

  const { type } = req.query;
  if (type !== "login" && type !== "registration") {
    return res
      .status(400)
      .json({ error: "Неверный тип потока", receivedType: type });
  }

  try {
    const initUrl = `${KRATOS_URL}/self-service/${type}/browser`;
    console.log("Запрос к Kratos:", initUrl);

    const commonHeaders: HeadersInit = { Accept: "application/json" };
    if (req.headers.cookie) {
      commonHeaders["Cookie"] = req.headers.cookie;
    }

    const initRes = await fetch(initUrl, {
      method: "GET",
      headers: commonHeaders,
    });
    const initText = await initRes.text();

    let initData: any;
    try {
      initData = JSON.parse(initText);
    } catch (e) {
      console.error("Парсинг JSON от Kratos упал:", e);
      return res
        .status(500)
        .json({ error: "Не удалось распарсить ответ Kratos" });
    }

    if (initData.redirect_to) {
      const urlObj = new URL(initData.redirect_to);
      const flowId = urlObj.searchParams.get("flow");
      if (flowId) {
        const flowUrl = `${KRATOS_URL}/self-service/${type}?flow=${flowId}`;
        console.log("Запрос данных flow:", flowUrl);

        const flowRes = await fetch(flowUrl, {
          method: "GET",
          headers: commonHeaders,
        });

        const flowData = await flowRes.json();

        const sc = flowRes.headers.get("set-cookie");
        if (sc) {
          console.log("Forward CSRF-cookie (flow) → фронт");
          res.setHeader("Set-Cookie", stripDomain(sc));
        }

        return res.status(200).json(flowData);
      }
    }

    const sc = initRes.headers.get("set-cookie");
    if (sc) {
      console.log("Forward CSRF-cookie (initial) → фронт");
      console.log("cookies was", sc);
      console.log("cookies become", stripDomain(sc));
      res.setHeader("Set-Cookie", stripDomain(sc));
    }

    return res.status(initRes.status).json(initData);
  } catch (err) {
    console.error("Ошибка в API initialize-flow:", err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
