import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    message: "Kratos Auth API",
    endpoints: [
      {
        path: "/api/auth/initialize-flow",
        methods: ["GET"],
        description: "Инициализация потока авторизации",
      },
      {
        path: "/api/auth/submit-flow",
        methods: ["POST"],
        description: "Отправка формы авторизации",
      },
      {
        path: "/api/auth/session",
        methods: ["GET"],
        description: "Проверка текущей сессии",
      },
      {
        path: "/api/auth/logout",
        methods: ["POST", "GET"],
        description: "Выход из системы",
      },
    ],
  });
}
