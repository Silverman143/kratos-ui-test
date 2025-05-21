"use client";
import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL: string = "/api/auth";

interface FormDataState {
  email: string;
  password: string;
  confirmPassword: string;
  role?: string;
}

interface KratosFormData {
  method: string;
  csrf_token: string;
  password: string;
  traits?: {
    email: string;
    role: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface KratosFlow {
  id: string;
  type: string;
  ui: {
    nodes: Array<{
      attributes: {
        name?: string;
        value?: string;
        [key: string]: any;
      };
      [key: string]: any;
    }>;
    messages?: Array<{
      id: number;
      text: string;
      type: string;
    }>;
  };
  [key: string]: any;
}

const AuthComponent: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [flowId, setFlowId] = useState<string>("");
  const router = useRouter();

  const [formData, setFormData] = useState<FormDataState>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const initializeFlow = async (
    flowType: "login" | "registration"
  ): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/initialize-flow?type=${flowType}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(
          `Не удалось инициализировать ${flowType} поток`,
          response.status,
          response.statusText
        );
        throw new Error(
          `Не удалось инициализировать ${flowType} поток. Код: ${response.status}`
        );
      }
      const data: KratosFlow = await response.json();

      setFlowId(data.id);

      const csrf =
        data.ui?.nodes?.find((node) => node.attributes?.name === "csrf_token")
          ?.attributes?.value || "";

      console.log("New token ", csrf);

      setCsrfToken(csrf);
      setLoading(false);
    } catch (err) {
      const error = err as Error;
      console.error("Ошибка инициализации flow:", error);
      setError(`Ошибка: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeFlow(isLogin ? "login" : "registration");
  }, [isLogin]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    try {
      const formDataToSend: KratosFormData = {
        method: "password",
        csrf_token: csrfToken,
        password: formData.password,
        identifier: formData.email,
      };

      if (!isLogin) {
        formDataToSend.traits = {
          email: formData.email,
          role: "user",
        };
      }

      const payload = {
        flowId,
        actionType: isLogin ? "login" : "registration",
        formData: formDataToSend,
      };

      console.log("Проверка данных перед отправкой:", {
        flowId,
        csrfToken,
        actionType: isLogin ? "login" : "registration",
        formData: formDataToSend,
      });

      console.log("Отправка запроса на:", `${API_URL}/submit-flow`);
      console.log("С данными:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_URL}/submit-flow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log("Получен ответ:", {
        status: response.status,
        statusText: response.statusText,
      });

      const responseText = await response.text();
      console.log("Текст ответа:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Данные ответа:", data);
      } catch (e) {
        console.error("Ошибка парсинга JSON:", e);
        setError(`Некорректный ответ от сервера: ${responseText}`);
        setLoading(false);
        return;
      }

      if (response.ok) {
        console.log("Успешный вход/регистрация");
        router.push("/dashboard");
      } else {
        const errorMessage =
          data.error ||
          (data.ui?.messages && data.ui.messages.length > 0
            ? data.ui.messages[0].text
            : null) ||
          "Произошла ошибка, попробуй снова";

        console.error("Ошибка аутентификации:", {
          status: response.status,
          error: errorMessage,
          details: data,
        });

        setError(errorMessage);

        if (
          data.flowError === "expired_flow" ||
          data.flowError === "invalid_flow"
        ) {
          console.log("Перезапуск flow из-за ошибки или истечения срока");
          initializeFlow(isLogin ? "login" : "registration");
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error("Ошибка отправки формы:", error);
      setError(`Ошибка: ${error.message}`);
    }

    setLoading(false);
  };

  const toggleMode = (): void => {
    setIsLogin(!isLogin);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? "Вход" : "Регистрация"}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="confirmPassword">Подтвердите пароль:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
        </button>
      </form>

      <div className="toggle-mode">
        <p>
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          <button type="button" onClick={toggleMode} className="toggle-button">
            {isLogin ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>

      <style jsx>{`
        .auth-container {
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          background-color: white;
        }

        h2 {
          text-align: center;
          margin-bottom: 24px;
        }

        .error-message {
          background-color: #ffebee;
          color: #d32f2f;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        button {
          width: 100%;
          padding: 12px;
          background-color: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: #3367d6;
        }

        button:disabled {
          background-color: #a0a0a0;
          cursor: not-allowed;
        }

        .toggle-mode {
          text-align: center;
          margin-top: 16px;
        }

        .toggle-button {
          background: none;
          border: none;
          color: #4285f4;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          margin-left: 8px;
          width: auto;
        }

        .toggle-button:hover {
          text-decoration: underline;
          background: none;
        }
      `}</style>
    </div>
  );
};

export default AuthComponent;
