import { useNavigate } from "react-router";
import { ArrowLeft, Clock, CheckSquare, Lightbulb, Users } from "lucide-react";

const WORKFLOW = [
  {
    step: 1,
    time: "6:30 AM — Before You Leave Home",
    title: "Check Your Phone",
    desc: "Open the MediaPrep app. Confirm you're signed in. Check if any team messages or last-minute changes were posted.",
    tip: "Add the app to your home screen for one-tap access. It works offline, so no worries about church WiFi.",
  },
  {
    step: 2,
    time: "7:15 AM — Arrival at Church (Media Team)",
    title: "Team Briefing + App Launch",
    desc: "Huddle with the team. Team lead confirms the setlist, sermon notes, and any special elements. Everyone opens their role-specific checklist.",
    tip: null,
    checklist: ["Talkback charged and tested", "Team huddle complete", "Final setlist confirmed", "Sermon notes received"],
  },
  {
    step: 3,
    time: "7:30 AM — Video & Audio Setup",
    title: "Work Through Your Phase",
    desc: "Each team member works through their timed checklist. Tap items as you complete them. The app tracks your progress and timestamps everything.",
    tip: "If something breaks, tap the red 'Report Issue' button immediately. The team lead sees it instantly on their dashboard.",
  },
  {
    step: 4,
    time: "8:55 AM — Final Go-Live",
    title: "Team Lead Checks Dashboard",
    desc: "Team lead opens the Admin Dashboard (on laptop/tablet). Sees everyone's progress percentage. Red = behind, Green = ready. Addresses any flagged issues.",
    tip: null,
    checklist: ["Camera ops: 100% ready", "Stream: 95% ready", "Sound: 82% — checking monitors", "Photos: 70% — positioning"],
  },
  {
    step: 5,
    time: "9:00 AM — Service Live",
    title: "During Service: Monitor & Capture",
    desc: "Keep the app open in pocket or nearby. Content team checks 'During Service' tasks. Photographer captures moments. Stream operator monitors health.",
    tip: null,
  },
  {
    step: 6,
    time: "12:00 PM — Post-Service",
    title: "Wrap & Reset",
    desc: "5-minute debrief. Team lead resets checklist for next week. Content team posts within 2 hours. Photos delivered. Equipment stored properly.",
    tip: "The Admin Dashboard lets you reset progress for a fresh start next Sunday.",
  },
];

const ROLES = [
  { icon: "fas fa-user-shield", title: "Team Lead", desc: "Uses Admin Dashboard on laptop. Sees all progress. Resets weekly. Manages issues." },
  { icon: "fas fa-video", title: "Camera Operator", desc: "Checks camera setup, PTZ, mixer, recording. Reports equipment issues." },
  { icon: "fas fa-broadcast-tower", title: "Stream Operator", desc: "vMix setup, YouTube key, internet test, stream monitoring during service." },
  { icon: "fas fa-microphone", title: "Sound Engineer", desc: "Mic batteries, line check, monitor mixes, house EQ, backup recorder." },
  { icon: "fas fa-desktop", title: "Presentation", desc: "EasyWorship setup, song slides, NDI test, run-through with worship team." },
  { icon: "fas fa-camera", title: "Photography", desc: "Gear check, silent shutter, worship/sermon shots, post-service editing." },
  { icon: "fas fa-pen-nib", title: "Content Team", desc: "Edit during service, post within 2hrs, thumbnails, sermon quotes." },
  { icon: "fas fa-lightbulb", title: "Lighting", desc: "Fixture check, three-point balance, cues programmed, house lights." },
];

export default function Guide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-[#FCFBF9]">
      <div className="max-w-[900px] mx-auto px-5 py-10">
        {/* Header */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#797774] hover:text-[#FCFBF9] text-[13px] font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>

        <div className="text-center mb-12 pb-8 border-b border-[rgba(252,251,249,0.08)]">
          <div className="w-16 h-16 bg-[#4A32A0] rounded-xl flex items-center justify-center mx-auto mb-5">
            <CheckSquare className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-3xl lg:text-4xl font-extrabold mb-2"
            style={{ letterSpacing: "-0.015em", lineHeight: 1 }}
          >
            MediaPrep Sunday Workflow
          </h1>
          <p className="text-[15px] text-[#797774]">
            How to use the app every Sunday to make it a mainstay
          </p>
        </div>

        {/* Workflow */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#4A32A0]" />
            The Sunday Morning Routine
          </h2>

          <div className="space-y-4">
            {WORKFLOW.map((step) => (
              <div
                key={step.step}
                className="relative bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-6"
              >
                <div className="absolute left-5 top-6 w-8 h-8 bg-[#4A32A0] rounded-full flex items-center justify-center text-sm font-bold">
                  {step.step}
                </div>
                <div className="pl-14">
                  <div className="inline-flex items-center gap-1.5 bg-[rgba(241,162,8,0.1)] text-[#F1A208] text-[11px] font-bold uppercase px-3 py-1 rounded-full mb-3" style={{ letterSpacing: "0.03em" }}>
                    <Clock className="w-3 h-3" />
                    {step.time}
                  </div>
                  <h3 className="text-[15px] font-bold mb-2">{step.title}</h3>
                  <p className="text-[13px] text-[#797774] leading-relaxed mb-3">{step.desc}</p>

                  {step.tip && (
                    <div className="bg-[rgba(74,50,160,0.1)] border-l-[3px] border-[#4A32A0] px-4 py-3 rounded-r-lg">
                      <p className="text-[12px] text-[#797774] flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-[#4A32A0] mt-0.5 flex-shrink-0" />
                        {step.tip}
                      </p>
                    </div>
                  )}

                  {step.checklist && (
                    <div className="mt-3 bg-black rounded-lg p-4 space-y-2">
                      {step.checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-[13px]">
                          <div className="w-[14px] h-[14px] border border-[#797774] flex-shrink-0" style={{ borderRadius: 0 }} />
                          <span className="text-[#FCFBF9]">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roles */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Users className="w-5 h-5 text-[#4A32A0]" />
            Who Does What in the App
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="bg-[#1A1A1A] border border-[rgba(252,251,249,0.08)] rounded-xl p-5 text-center hover:border-[rgba(252,251,249,0.15)] transition-colors"
              >
                <i className={`${role.icon} text-[#4A32A0] text-2xl mb-3 block`} />
                <h4 className="text-[14px] font-bold mb-1">{role.title}</h4>
                <p className="text-[12px] text-[#797774] leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="text-center rounded-2xl p-8 border border-[#4A32A0]"
          style={{ background: "linear-gradient(135deg, rgba(74,50,160,0.2), rgba(74,50,160,0.05))" }}
        >
          <h2 className="text-xl font-bold mb-2">Ready for This Sunday?</h2>
          <p className="text-[13px] text-[#797774] mb-6">
            Open the mobile app on your phone, or launch the Admin Dashboard on your laptop.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/")}
              className="h-12 px-6 bg-[#4A32A0] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#351C75] transition-colors"
              style={{ letterSpacing: "0.03em" }}
            >
              Open Mobile App
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="h-12 px-6 bg-transparent border border-[#4A32A0] text-[#FCFBF9] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#4A32A0] transition-colors"
              style={{ letterSpacing: "0.03em" }}
            >
              Open Admin Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
