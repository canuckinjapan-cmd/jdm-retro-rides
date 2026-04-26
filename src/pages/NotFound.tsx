import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <h1 className="text-9xl font-display text-bronze">404</h1>
        <p className="mt-4 text-xl">Page Not Found</p>
        <Link to="/" className="mt-8 inline-block text-secondary hover:underline">Return Home</Link>
      </div>
    </div>
  );
};

export default NotFound;
