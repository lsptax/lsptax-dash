import { getApiBaseUrl } from "./client";

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error("Login failed");
    }

    const data = await response.json();
    const { token, user } = data;
    const displayName = user?.name ?? user?.email ?? email ?? "User";
    localStorage.setItem("token", token);
    localStorage.setItem("username", displayName);
    localStorage.setItem("email", email);
    localStorage.setItem("user", JSON.stringify(user));

    return data;
  } catch (error) {
    console.error("Error during login:", error);
    throw new Error("Login failed. Please try again.");
  }
};

export const logoutUser = async () => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const response = await fetch(
        `${getApiBaseUrl()}/auth/logout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response during logout:", errorText);
        throw new Error("Logout failed on the server");
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
  } catch (error) {
    console.error("Error during logout:", error);
    throw new Error("Logout failed. Please try again.");
  }
};
