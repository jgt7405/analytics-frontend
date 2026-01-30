// src/components/layout/ContactModal.tsx
"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formMessage, setFormMessage] = useState("");

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);
    setFormMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormMessage("Thank you! Your message has been sent successfully.");
        setFormData({
          name: "",
          email: "",
          phone: "",
          message: "",
        });
        setTimeout(() => {
          onClose();
          setFormMessage("");
        }, 2000);
      } else {
        setFormMessage("Error sending message. Please try again.");
      }
    } catch (error) {
      setFormMessage("Error sending message. Please try again.");
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmittingForm(false);
    }
  };

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
            Contact
          </h2>
          <button
            onClick={() => {
              onClose();
              setFormMessage("");
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none"
            style={{ padding: 0, cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <p
            className="text-sm text-gray-600"
            style={{
              fontFamily: "Roboto Condensed, system-ui, sans-serif",
              margin: 0,
            }}
          >
            Send email to jacob@jthomanalytics.com or fill out form below
            (contact information optional):
          </p>
          <form
            onSubmit={handleFormSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
                placeholder="(123) 456-7890"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleFormChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
                placeholder="Your message..."
              />
            </div>

            {formMessage && (
              <div
                className={`text-sm p-3 rounded-md ${
                  formMessage.includes("successfully")
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
                style={{
                  fontFamily: "Roboto Condensed, system-ui, sans-serif",
                }}
              >
                {formMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingForm}
              className="w-full text-white font-medium py-2 px-4 rounded-md transition-colors"
              style={{
                backgroundColor: isSubmittingForm ? "#999" : "rgb(0, 151, 178)",
                fontFamily: "Roboto Condensed, system-ui, sans-serif",
                cursor: isSubmittingForm ? "not-allowed" : "pointer",
              }}
            >
              {isSubmittingForm ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
