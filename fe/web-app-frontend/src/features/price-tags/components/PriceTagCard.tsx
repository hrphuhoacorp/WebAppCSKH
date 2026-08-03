'use client';

import { useMemo } from "react";
import { PriceTag, PrintSettings } from "../types";
import { montserrat } from "../fonts";

interface PriceTagCardProps {
  tag: PriceTag;
  settings: PrintSettings;
  preview?: boolean; // If in preview on webpage vs print sheet
}

export default function PriceTagCard({ tag, settings, preview = false }: PriceTagCardProps) {
  // Parse Vietnam Price to major part and minor suffix part
  const parsedPrice = useMemo(() => {
    const rawPrice = tag.price;
    if (rawPrice === undefined || rawPrice === null) {
      return { main: "0", suffix: ".000 đ" };
    }

    // Is it a number?
    const num = Number(rawPrice);
    if (isNaN(num)) {
      return { main: String(rawPrice), suffix: " đ" };
    }

    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      // Format thousands with dots (e.g. 1.250)
      const mainStr = String(thousands).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const remStr = String(remainder).padStart(3, "0");
      return {
        main: mainStr,
        suffix: `.${remStr} đ`
      };
    } else {
      return {
        main: String(num),
        suffix: " đ"
      };
    }
  }, [tag.price]);

  // Determine font size of product name to ensure auto-fit representation without layout breaking
  // Calculates size dynamically based on characters count to ensure pristine print support
  const nameFontSizeStyle = useMemo(() => {
    const len = tag.name.length;
    let baseSize = 0.66;
    if (len <= 15) baseSize = 1.25;
    else if (len <= 25) baseSize = 1.05;
    else if (len <= 35) baseSize = 0.90;
    else if (len <= 50) baseSize = 0.78;

    const scale = (settings.fontSizeName || 120) / 100;
    return `${baseSize * scale}rem`;
  }, [tag.name, settings.fontSizeName]);

  // Determine font size of origin text
  const originFontSizeStyle = useMemo(() => {
    const len = tag.origin.length;
    let baseSize = 0.62;
    if (len <= 15) baseSize = 0.78;
    else if (len <= 25) baseSize = 0.72;

    const scale = (settings.fontSizeOrigin || 95) / 100;
    return `${baseSize * scale}rem`;
  }, [tag.origin, settings.fontSizeOrigin]);

  // Determine price main numeric size
  const priceFontSizeStyle = useMemo(() => {
    const scale = (settings.fontSizePrice || 130) / 100;
    return `${2.55 * scale}rem`;
  }, [settings.fontSizePrice]);

  // Determine suffix and unit text size
  const suffixFontSizeStyle = useMemo(() => {
    const scale = (settings.fontSizeUnit || 140) / 100;
    return `${0.92 * scale}rem`;
  }, [settings.fontSizeUnit]);

  const unitFontSizeStyle = useMemo(() => {
    const scale = (settings.fontSizeUnit || 140) / 100;
    return `${0.85 * scale}rem`;
  }, [settings.fontSizeUnit]);

  // Build dynamic style block based on settings — font is fixed to Montserrat Bold
  const cardStyle = {
    borderColor: settings.borderColor,
    color: settings.textColor,
    borderWidth: `${settings.borderWidth}px`,
    fontFamily: montserrat.style.fontFamily,
  };

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-white text-center rounded-[2px] transition-all
        ${settings.showBorder ? "border-solid" : "border-none"}
        ${preview ? "shadow-sm hover:shadow-md h-[115px]" : "h-full w-full"}`}
      style={cardStyle}
    >
      {/* Inner spacing container simulating photo's layout */}
      <div className="flex flex-col flex-1 p-1.5 px-3 pb-1 justify-between h-full">

        {/* UPPER: Product Name (with elegant flexible line height and auto-fit styling) */}
        <div className="flex flex-col justify-center items-center flex-1 min-h-[35%] px-1">
          <h3
            className={`font-bold leading-[1.12] max-h-[3em] overflow-hidden line-clamp-2 select-all`}
            style={{
              fontSize: "inherit",
              color: settings.textColor,
              fontWeight: 900
            }}
          >
            <span style={{ fontSize: nameFontSizeStyle }}>
              {tag.name}
            </span>
          </h3>
        </div>

        {/* MIDDLE: Origin section with a clean horizontal divider lines on both sides or centered sitting on a line */}
        <div className="w-full flex flex-col justify-end items-center mt-1.5 mb-0 select-all">
          <div
            className="font-semibold tracking-wide flex items-center justify-center gap-1 "
            style={{ color: settings.textColor, fontSize: originFontSizeStyle, }}
          >
            <span className="opacity-90">Xuất xứ :</span>
            <span className="font-bold underlinedecoration-1 underline-offset-2">{tag.origin || "Việt Nam"}</span>
          </div>
          {/* Divider Line directly from the image style */}
          <div
            className="w-[90%] h-[1.5px] mt-0 mb-0.5"
            style={{ backgroundColor: settings.borderColor }}
          />
        </div>

        {/* LOWER: Mega Price and Unit wrapper */}
        <div className="flex items-center justify-center gap-1.5 flex-[1.1] min-h-[30%] overflow-hidden select-all mb-0.5">

          {/* Price prefix digits (Major part, very large) */}
          <span
            className="tracking-tighter leading-none"
            style={{
              fontSize: priceFontSizeStyle,
              color: settings.textColor,
              fontWeight: 900
            }}
          >
            {parsedPrice.main}
          </span>

          {/* Suffix decimal part & Unit stacked vertically exactly like user image */}
          <div className="flex flex-col items-start leading-[1.05] justify-center pt-0.5">
            {/* Decimal trailing and Currency */}
            <span
              className="font-extralight tracking-tight text-left select-all"
              style={{
                fontSize: suffixFontSizeStyle,
                fontWeight: 800,
                color: settings.textColor
              }}
            >
              {parsedPrice.suffix}
            </span>

            {/* Unit divider */}
            <span
              className="font-bold tracking-normal text-left truncate max-w-[70px] select-all"
              style={{
                fontSize: unitFontSizeStyle,
                color: settings.textColor
              }}
            >
              / {tag.unit || "Hũ"}
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
