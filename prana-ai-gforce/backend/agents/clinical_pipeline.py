import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

import requests
from groq import Groq
import omium
from omium import OmiumConfig

from agents.manager import agent_manager
from services.prediction import predictor
from config import config

logger = logging.getLogger(__name__)

# Initialize Omium
omium.configure(
    OmiumConfig(
        api_key=config.OMIUM_API_KEY,
        project="Prana-GForce",
        auto_trace=True,
    )
)
omium.init()

# Initialize Groq for reasoning
groq_client = Groq(api_key=config.GROQ_API_KEY) if config.GROQ_API_KEY else None

class ClinicalAutonomyPipeline:
    """Autonomous multi-agent workflow for remote cardiac patient monitoring with Omium tracing."""

    @omium.trace("clinical_workflow_root")
    async def run(self, payload: Dict[str, Any], workflow_id: str | None = None) -> Dict[str, Any]:
        workflow_id = workflow_id or payload.get("workflow_id") or "manual-run"
        patient = payload.get("patient") or self._default_patient()
        vitals = payload.get("vitals") or self._default_vitals()
        event = payload.get("event") or "manual_clinical_review"

        self._event(workflow_id, "planner", "plan", "running", "Decomposing case and assigning specialist agents.", {
            "event": event,
            "patient": patient,
            "vitals": vitals,
        })

        # Deep Reasoning: Planner decomposition
        plan = await self._planner_reasoning(patient, vitals, event)
        self._event(workflow_id, "planner", "plan", "completed", "Plan created with deep reasoning and parallel branches.", plan)

        # Parallel Execution with Tracing
        risk_task = self._risk_agent(workflow_id, vitals)
        research_task = self._research_agent(workflow_id, patient, vitals)
        context_task = self._patient_context_agent(workflow_id, patient, payload)
        
        risk, research, context = await asyncio.gather(risk_task, research_task, context_task)

        # Synthesis and Care Planning
        care_plan = await self._care_plan_agent(workflow_id, patient, vitals, risk, research, context)
        notification = await self._notification_agent(workflow_id, patient, care_plan)
        
        # Self-Reflection / Audit
        reflection = await self._reflection_agent(workflow_id, plan, risk, research, care_plan, notification)

        result = {
            "workflow_id": workflow_id,
            "status": "completed",
            "patient": patient,
            "risk": risk,
            "research": research,
            "context": context,
            "care_plan": care_plan,
            "notification": notification,
            "reflection": reflection,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        self._event(workflow_id, "planner", "complete", "completed", "Autonomous workflow finished with verifiable Omium trace.", result)
        return result

    @omium.trace("planner_reasoning")
    async def _planner_reasoning(self, patient: Dict[str, Any], vitals: Dict[str, Any], event: str) -> Dict[str, Any]:
        """Uses LLM to decompose the task and plan the workflow."""
        if not groq_client:
            return self._build_plan_fallback(patient, vitals, event)
            
        prompt = f"""
        You are the Lead Clinical Planner for PRANA AI. 
        Analyze this incoming medical event: {event}
        Patient: {json.dumps(patient)}
        Vitals: {json.dumps(vitals)}
        
        Decompose this task into a multi-agent plan. 
        Return a JSON object with:
        - "goal": overall objective
        - "priority": "emergency", "urgent", or "routine"
        - "agents": list of specialized agents to involve
        - "reasoning": why you chose this plan
        """
        
        try:
            chat = groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            plan = json.loads(chat.choices[0].message.content)
            return plan
        except Exception as e:
            logger.error(f"Planner reasoning failed: {e}")
            return self._build_plan_fallback(patient, vitals, event)

    def _build_plan_fallback(self, patient: Dict[str, Any], vitals: Dict[str, Any], event: str) -> Dict[str, Any]:
        danger_signals = []
        if vitals.get("ejection_fraction", 99) < 35:
            danger_signals.append("low_ejection_fraction")
        if vitals.get("serum_creatinine", 0) > 1.5:
            danger_signals.append("renal_stress")

        return {
            "goal": "Assess deterioration risk and generate care plan.",
            "event": event,
            "patient_id": patient.get("id", "demo-patient"),
            "priority": "emergency" if len(danger_signals) >= 1 else "watch",
            "agents": ["risk_agent", "web_research_agent", "patient_context_agent", "care_plan_agent", "notification_agent", "reflection_agent"],
        }

    @omium.trace("risk_agent")
    async def _risk_agent(self, workflow_id: str, vitals: Dict[str, Any]) -> Dict[str, Any]:
        self._event(workflow_id, "risk_agent", "agent_step", "running", "Running trained heart-failure model.", {})
        result = predictor.predict(vitals)
        score = round(float(result["risk_score"]) * 100, 1)
        output = {
            "risk_score": score,
            "risk_level": getattr(result["risk_level"], "value", str(result["risk_level"])),
            "explanation": result["explanation"],
            "requires_escalation": score >= 60,
        }
        agent_manager.add_tool_call(workflow_id, "risk_agent", "heart_failure_predictor", vitals, output)
        self._event(workflow_id, "risk_agent", "agent_step", "completed", f"Risk model completed with score {score}/100.", output)
        return output

    @omium.trace("research_agent")
    async def _research_agent(self, workflow_id: str, patient: Dict[str, Any], vitals: Dict[str, Any]) -> Dict[str, Any]:
        self._event(workflow_id, "web_research_agent", "agent_step", "running", "Searching live clinical context.", {})
        query = self._research_query(patient, vitals)
        result = await asyncio.to_thread(self._web_search, query)
        
        # Deep Reasoning: Process research with LLM
        if groq_client and result["status"] == "completed":
            research_summary = await self._summarize_research(result["results"], vitals)
            result["clinical_guidance"] = research_summary

        agent_manager.add_tool_call(workflow_id, "web_research_agent", "web_search", {"query": query}, result)
        self._event(workflow_id, "web_research_agent", "agent_step", "completed", "Research branch returned clinical context.", result)
        return result

    @omium.trace("summarize_research")
    async def _summarize_research(self, results: List[Dict], vitals: Dict) -> str:
        prompt = f"Summarize the following clinical research results in the context of a patient with these vitals: {json.dumps(vitals)}\nResults: {json.dumps(results)}"
        try:
            chat = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}]
            )
            return chat.choices[0].message.content
        except:
            return "Unable to summarize research."

    @omium.trace("patient_context_agent")
    async def _patient_context_agent(self, workflow_id: str, patient: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
        self._event(workflow_id, "patient_context_agent", "agent_step", "running", "Reading patient records.", {})
        context = {
            "patient_id": patient.get("id", "demo-patient"),
            "name": patient.get("name", "Demo Patient"),
            "conditions": patient.get("conditions", ["chronic heart failure"]),
            "medications": patient.get("medications", ["Metformin", "Amlodipine", "Aspirin"]),
            "contacts": patient.get("contacts", [{"role": "doctor", "name": "Dr. Ramesh Kumar", "channel": "dashboard"}]),
            "webhook_source": payload.get("source", "manual"),
        }
        agent_manager.add_tool_call(workflow_id, "patient_context_agent", "patient_record_lookup", {"patient": patient}, context)
        self._event(workflow_id, "patient_context_agent", "agent_step", "completed", "Patient context loaded.", context)
        return context

    @omium.trace("care_plan_agent")
    async def _care_plan_agent(
        self,
        workflow_id: str,
        patient: Dict[str, Any],
        vitals: Dict[str, Any],
        risk: Dict[str, Any],
        research: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        self._event(workflow_id, "care_plan_agent", "agent_step", "running", "Synthesizing actions with LLM reasoning.", {})
        
        if groq_client:
            prompt = f"""
            You are a Clinical Care Strategist. 
            Patient: {json.dumps(context)}
            Current Vitals: {json.dumps(vitals)}
            ML Risk Score: {risk['risk_score']}/100
            Clinical Research: {research.get('clinical_guidance', 'No specific guidance')}
            
            Generate a care plan. Return JSON with:
            - "summary": brief clinical summary
            - "triage": "emergency", "urgent", or "routine"
            - "actions": list of concrete medical/operational steps
            - "patient_message": empathetic message for the patient
            """
            try:
                chat = groq_client.chat.completions.create(
                    model="llama-3.1-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"}
                )
                plan = json.loads(chat.choices[0].message.content)
                plan["disclaimer"] = "Clinical decision support only. Consult a licensed clinician."
                agent_manager.add_tool_call(workflow_id, "care_plan_agent", "llm_synthesis", {"input": "multi-agent-context"}, plan)
                self._event(workflow_id, "care_plan_agent", "agent_step", "completed", "Care plan created via LLM synthesis.", plan)
                return plan
            except Exception as e:
                logger.error(f"Care plan synthesis failed: {e}")

        # Fallback to hardcoded logic if LLM fails
        return self._care_plan_fallback(context, risk, vitals)

    def _care_plan_fallback(self, context, risk, vitals) -> Dict[str, Any]:
        actions = ["Continue routine monitoring"]
        if risk["risk_score"] >= 70: actions = ["Escalate immediately to emergency."]
        return {
            "summary": f"Automatic assessment for {context['name']}.",
            "triage": "emergency" if risk["risk_score"] >= 70 else "routine",
            "actions": actions,
            "patient_message": f"PRANA has reviewed your vitals. Risk is {risk['risk_score']}/100.",
            "disclaimer": "Fallback logic used."
        }

    @omium.trace("notification_agent")
    async def _notification_agent(self, workflow_id: str, patient: Dict[str, Any], care_plan: Dict[str, Any]) -> Dict[str, Any]:
        self._event(workflow_id, "notification_agent", "agent_step", "running", "Dispatching autonomous alerts.", {})

        should_call = care_plan["triage"] == "emergency"
        should_push = care_plan["triage"] in {"emergency", "urgent"}

        notification = {
            "channels": ["dashboard", "webhook_ack"],
            "should_call": should_call,
            "should_push": should_push,
            "message": care_plan["patient_message"],
            "recipient_count": len(patient.get("contacts", [])) or 1,
        }

        # Actually dispatch alerts via TwilioAlertAgent
        if should_call or should_push:
            try:
                from agents.twilio_agent import twilio_alert_agent

                actions = []
                if should_call:
                    actions.append("call")
                if should_push:
                    actions.append("push")

                alert_result = await twilio_alert_agent.handle({
                    "patient_name": patient.get("name", "Unknown Patient"),
                    "risk_score": care_plan.get("risk_score", "unknown"),
                    "language": patient.get("language", "en"),
                    "message": care_plan["patient_message"],
                    "actions": actions,
                })
                notification["alert_result"] = alert_result
                agent_manager.add_tool_call(workflow_id, "notification_agent", "twilio_alert_dispatch", care_plan, alert_result)
            except Exception as e:
                logger.error(f"Alert dispatch failed: {e}")
                notification["alert_error"] = str(e)

        agent_manager.add_tool_call(workflow_id, "notification_agent", "notification_dispatch", care_plan, notification)
        self._event(workflow_id, "notification_agent", "agent_step", "completed", "Notification packet prepared and dispatched.", notification)
        return notification

    @omium.trace("reflection_agent")
    async def _reflection_agent(
        self,
        workflow_id: str,
        plan: Dict[str, Any],
        risk: Dict[str, Any],
        research: Dict[str, Any],
        care_plan: Dict[str, Any],
        notification: Dict[str, Any],
    ) -> Dict[str, Any]:
        self._event(workflow_id, "reflection_agent", "agent_step", "running", "Autonomous self-audit and Omium trace check.", {})
        
        reflection_prompt = f"""
        Review this autonomous workflow for correctness and safety.
        Plan: {json.dumps(plan)}
        Result: {json.dumps(care_plan)}
        
        Identify any gaps or safety concerns. Return JSON with:
        - "decision_quality": "excellent", "good", or "needs_review"
        - "safety_check": "passed" or "failed"
        - "gaps": list of missing information
        - "next_autonomous_step": what should the system do next?
        """
        
        try:
            chat = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": reflection_prompt}],
                response_format={"type": "json_object"}
            )
            reflection = json.loads(chat.choices[0].message.content)
            reflection["trace_hash"] = self._hash({"plan": plan, "care_plan": care_plan})
            self._event(workflow_id, "reflection_agent", "agent_step", "completed", "Reflection completed with audit.", reflection)
            return reflection
        except:
            return {"status": "reflection_failed", "decision_quality": "unknown"}

    def _web_search(self, query: str) -> Dict[str, Any]:
        try:
            response = requests.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_redirect": 1, "no_html": 1},
                timeout=8,
            )
            response.raise_for_status()
            data = response.json()
            related = data.get("RelatedTopics", [])[:3]
            results = []
            for item in related:
                if "Text" in item:
                    results.append({"title": item.get("FirstURL", "Clinical result"), "snippet": item["Text"]})
            if data.get("AbstractText"):
                results.insert(0, {"title": data.get("Heading", "Abstract"), "snippet": data["AbstractText"]})
            return {"status": "completed", "query": query, "results": results[:3] or self._fallback_research(query)}
        except Exception as exc:
            return {"status": "fallback", "query": query, "error": str(exc), "results": self._fallback_research(query)}

    def _research_query(self, patient: Dict[str, Any], vitals: Dict[str, Any]) -> str:
        return f"clinical guidance heart failure ejection fraction {vitals.get('ejection_fraction')} creatinine {vitals.get('serum_creatinine')}"

    def _fallback_research(self, query: str) -> List[Dict[str, str]]:
        return [{"title": "Heuristic", "snippet": "Monitor for renal stress and cardiac output reduction."}]

    def _hash(self, data: Dict[str, Any]) -> str:
        encoded = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()[:16]

    def _event(self, workflow_id: str, agent: str, kind: str, status: str, summary: str, payload: Any):
        agent_manager.add_event(workflow_id, agent, kind, status, summary, payload)

    def _default_patient(self) -> Dict[str, Any]:
        return {"id": "demo-patient", "name": "Manthan G", "age": 58, "conditions": ["chronic heart failure"]}

    def _default_vitals(self) -> Dict[str, Any]:
        return {"age": 58, "ejection_fraction": 24, "serum_creatinine": 2.0, "serum_sodium": 128}

clinical_pipeline = ClinicalAutonomyPipeline()

async def clinical_pipeline_handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    return await clinical_pipeline.run(payload, workflow_id=payload.get("workflow_id"))
