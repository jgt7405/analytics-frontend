// src/components/layout/Footer.tsx
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import ContactModal from "./ContactModal";

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function MethodologyModal({ isOpen, onClose }: MethodologyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div
          className="flex items-center justify-between border-b border-gray-200"
          style={{ padding: "6px 12px" }}
        >
          <h2
            className="text-xl font-bold text-gray-500"
            style={{
              fontFamily: "Roboto Condensed, system-ui, sans-serif",
              margin: 0,
            }}
          >
            Methodology
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none"
            style={{ padding: 0, cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "8px 12px" }}>
          <ul
            style={{
              fontFamily: "Roboto Condensed, system-ui, sans-serif",
              fontSize: "12px",
              fontWeight: "400",
              lineHeight: "1.3",
              color: "#666",
              margin: 0,
              paddingLeft: "16px",
            }}
          >
            <li style={{ marginBottom: "6px" }}>
              Create composite team ratings using KenPom, Evan Miya, and Bart
              Torvik
            </li>
            <li style={{ marginBottom: "6px" }}>
              Calculate win probabilities for future games based on composite
              ratings
            </li>
            <li style={{ marginBottom: "6px" }}>
              Simulate regular season 1,000 times to project standings and seeds
            </li>
            <li style={{ marginBottom: "6px" }}>
              Simulate conference championship tournament 1,000 times based on
              seeded matchups
            </li>
            <li style={{ marginBottom: "6px" }}>
              Seed teams in NCAA tournament using TWV from simulated seasons
            </li>
            <li style={{ marginBottom: "6px" }}>
              Simulate NCAA tournament 1,000 times
            </li>
            <li style={{ marginBottom: "6px" }}>
              Display aggregated results and trends from all simulations
            </li>
            <li>
              Update daily by 5:00 AM ET with current ratings (no preseason
              bias)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface SocialMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SocialMediaModal({ isOpen, onClose }: SocialMediaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div
          className="flex items-center justify-between border-b border-gray-200"
          style={{ padding: "6px 12px" }}
        >
          <h2
            className="text-xl font-bold text-gray-500"
            style={{
              fontFamily: "Roboto Condensed, system-ui, sans-serif",
              margin: 0,
            }}
          >
            Social Media
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none"
            style={{ padding: 0, cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "8px 12px" }}>
          <div className="flex flex-col gap-3">
            <a
              href="https://x.com/JThomAnalytics"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-6 h-6 text-gray-700"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.6l-5.17-6.763-5.91 6.763h-3.308l7.73-8.835L2.56 2.25h6.598l4.702 6.218L18.244 2.25zM17.09 19.765h1.828L5.782 4.137H3.826L17.09 19.765z" />
              </svg>
              <span
                className="font-medium text-gray-800"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                @JThomAnalytics
              </span>
            </a>
          </div>
          <p
            className="text-sm text-gray-600"
            style={{
              fontFamily: "Roboto Condensed, system-ui, sans-serif",
              margin: "8px 0 0 0",
            }}
          >
            Follow on X for latest analytics insights.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);

  return (
    <>
      <footer style={{ background: "white", marginTop: "-8px", paddingTop: 0 }}>
        <div
          className="container mx-auto px-4"
          style={{
            borderTop: "none",
            backgroundColor: "white",
            padding: "2px 0 0 0",
          }}
        >
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setIsMethodologyOpen(true)}
              style={{
                fontFamily: "Roboto Condensed, system-ui, sans-serif",
                fontSize: "12px",
                fontWeight: "400",
                lineHeight: "1.3",
              }}
              className="text-gray-600 hover:text-gray-900 bg-transparent border-none p-0 cursor-pointer"
            >
              Methodology
            </button>
            <button
              onClick={() => setIsContactOpen(true)}
              style={{
                fontFamily: "Roboto Condensed, system-ui, sans-serif",
                fontSize: "12px",
                fontWeight: "400",
                lineHeight: "1.3",
              }}
              className="text-gray-600 hover:text-gray-900 bg-transparent border-none p-0 cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => setIsSocialOpen(true)}
              style={{
                fontFamily: "Roboto Condensed, system-ui, sans-serif",
                fontSize: "12px",
                fontWeight: "400",
                lineHeight: "1.3",
              }}
              className="text-gray-600 hover:text-gray-900 bg-transparent border-none p-0 cursor-pointer"
            >
              Social Media
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <SocialMediaModal
        isOpen={isSocialOpen}
        onClose={() => setIsSocialOpen(false)}
      />
    </>
  );
}
