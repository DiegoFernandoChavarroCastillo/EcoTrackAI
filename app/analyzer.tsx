"use client";

import { useState } from "react";
import InputForm from "@/components/InputForm";
import ResultCard from "@/components/ResultCard";
import StatePreview from "@/components/StatePreview";
import { analyze as requestAnalysis } from "@/lib/api";
import { MOCK_ANALYSIS } from "@/lib/mock";
import type { AnalysisState } from "@/lib/types";

/**
 * Contenedor con estado. Es el único punto que habla con lib/;
 * los componentes de components/ reciben todo por props.
 */
export default function Analyzer() {
  const [text, setText] = useState("");
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  async function analyze() {
    setState({ status: "loading" });
    try {
      const data = await requestAnalysis(text);
      setState({ status: "success", data });
    } catch (error) {
      setState({
        status: "error",
        // lib/api.ts garantiza que todo Error trae un mensaje presentable.
        message:
          error instanceof Error
            ? error.message
            : "Algo falló de nuestro lado. Inténtalo de nuevo en un momento.",
      });
    }
  }

  /** Salta directo a un estado para revisarlo a mano (solo desarrollo). */
  function previewStatus(status: AnalysisState["status"]) {
    if (status === "success") {
      setState({ status: "success", data: MOCK_ANALYSIS });
    } else if (status === "error") {
      setState({
        status: "error",
        message:
          "El texto es muy corto para reconocer actividades. Menciona qué usaste y cuánto, por ejemplo: 5 camionetas y 200 kWh.",
      });
    } else {
      setState({ status });
    }
  }

  return (
    <>
      <InputForm
        value={text}
        onChange={setText}
        onSubmit={analyze}
        isLoading={state.status === "loading"}
      />
      <ResultCard state={state} onRetry={() => setState({ status: "idle" })} />
      <StatePreview current={state.status} onSelect={previewStatus} />
    </>
  );
}
