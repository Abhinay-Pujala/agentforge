import { loginWithGoogle } from "../services/auth.service.js";

export default function Home() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="p-10">
      <button onClick={handleLogin}>SignIn with google</button>
    </div>
  );
}
