import { Suspense } from "react";
import CheckoutSuccessPage from "./CheckoutSuccessPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Cargando...</div>}>
      <CheckoutSuccessPage />
    </Suspense>
  );
}
