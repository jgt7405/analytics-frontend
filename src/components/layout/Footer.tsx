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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Methodology</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-center">
            Simulate entire basketball season using composite ratings from
            KenPom, Bart Torvik and Evan Miya.
          </p>
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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Social Media</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
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
              <span className="font-medium text-gray-800">@JThomAnalytics</span>
            </a>
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            Follow us on X for the latest basketball analytics and insights.
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
            padding: "4px 0",
          }}
        >
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setIsMethodologyOpen(true)}
              style={{ fontFamily: "Roboto Condensed, system-ui, sans-serif" }}
              className="text-gray-600 hover:text-gray-900 bg-transparent border-none p-0 cursor-pointer"
            >
              Methodology
            </button>
            <button
              onClick={() => setIsContactOpen(true)}
              style={{ fontFamily: "Roboto Condensed, system-ui, sans-serif" }}
              className="text-gray-600 hover:text-gray-900 bg-transparent border-none p-0 cursor-pointer"
            >
              Contact
            </button>
            <button
              onClick={() => setIsSocialOpen(true)}
              style={{ fontFamily: "Roboto Condensed, system-ui, sans-serif" }}
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
