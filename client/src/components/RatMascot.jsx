// PackRat's mascot — a cartoon rat head with cupped ears, a fur tuft,
// sunglasses, and a bandana. Animation states (idle/thinking/talking/wave)
// are driven purely by the `state` prop toggling a CSS class, mirroring the
// original hand-built demo's `setState()` but wired through React instead of
// a global DOM id.
export default function RatMascot({ state = "idle", className = "" }) {
  return (
    <div className={`rat-mascot rt ${state} ${className}`}>
      <svg width="100%" viewBox="0 0 680 360" role="img" xmlns="http://www.w3.org/2000/svg">
        <title>PackRat mascot</title>
        <desc>A cartoon rat head with large cupped ears, a tuft of fur between them, sunglasses perched on its brow and a bandana.</desc>
        <g className="bob">
          <g className="dots" opacity="0">
            <rect x="470" y="46" width="112" height="52" rx="24" fill="#EEEDFE" stroke="#AFA9EC" strokeWidth="3" />
            <circle className="d1" cx="502" cy="72" r="7" fill="#7F77DD" />
            <circle className="d2" cx="526" cy="72" r="7" fill="#7F77DD" />
            <circle className="d3" cx="550" cy="72" r="7" fill="#7F77DD" />
            <path d="M470 90 L450 110 L474 98 Z" fill="#EEEDFE" stroke="#AFA9EC" strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g className="wh">
            <path d="M288 214 L232 198" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M286 226 L226 226" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M290 238 L234 254" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M392 214 L448 198" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M394 226 L454 226" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M390 238 L446 254" stroke="#5B4FC7" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g className="ear earL">
            <path
              d="M302 176 C258 186 224 160 226 120 C228 84 258 64 290 74 C320 84 332 120 324 150 C320 164 312 172 302 176 Z"
              fill="#8B7BE8"
              stroke="#5B4FC7"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M300 162 C266 170 244 148 246 120 C248 94 270 80 291 88 C313 97 320 124 314 146 C311 154 306 160 300 162 Z"
              fill="#C9C1F5"
            />
            <path
              d="M290 152 C270 152 258 138 260 120 C262 104 274 96 288 100"
              fill="none"
              stroke="#AFA9EC"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="ear earR">
            <path
              d="M378 176 C422 186 456 160 454 120 C452 84 422 64 390 74 C360 84 348 120 356 150 C360 164 368 172 378 176 Z"
              fill="#8B7BE8"
              stroke="#5B4FC7"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M380 162 C414 170 436 148 434 120 C432 94 410 80 389 88 C367 97 360 124 366 146 C369 154 374 160 380 162 Z"
              fill="#C9C1F5"
            />
            <path
              d="M390 152 C410 152 422 138 420 120 C418 104 406 96 392 100"
              fill="none"
              stroke="#AFA9EC"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="tuft">
            <path
              d="M308 150 C310 126 314 108 323 94 C326 112 330 124 335 133 C337 112 341 96 348 85 C352 106 356 122 361 131 C365 118 370 108 377 99 C379 120 379 138 377 152 Z"
              fill="#8B7BE8"
              stroke="#5B4FC7"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M330 128 C332 114 336 104 341 96" fill="none" stroke="#C9C1F5" strokeWidth="4" strokeLinecap="round" />
          </g>
          <path d="M300 268 L380 268 L340 314 Z" fill="#6C5CE0" stroke="#5B4FC7" strokeWidth="4" strokeLinejoin="round" />
          <ellipse cx="340" cy="196" rx="88" ry="76" fill="#8B7BE8" stroke="#5B4FC7" strokeWidth="4" />
          <ellipse cx="340" cy="226" rx="50" ry="35" fill="#F4F2FF" />
          <g className="eyeG">
            <g className="eye eyeL">
              <circle cx="310" cy="192" r="15" fill="#3A2F8F" />
              <circle cx="305" cy="187" r="5" fill="#FFFFFF" />
            </g>
            <g className="eye eyeR">
              <circle cx="372" cy="192" r="15" fill="#3A2F8F" />
              <circle cx="367" cy="187" r="5" fill="#FFFFFF" />
            </g>
          </g>
          <g className="mouthG">
            <path className="mouth" d="M318 230 Q341 262 364 230 Z" fill="#3A2F8F" />
            <path className="tongue" d="M328 248 Q341 262 354 248 Z" fill="#ED93B1" />
          </g>
          <ellipse cx="341" cy="216" rx="13" ry="10" fill="#3A2F8F" />
          <g className="shades">
            <path d="M262 154 L418 150" stroke="#5B4FC7" strokeWidth="6" strokeLinecap="round" fill="none" />
            <rect x="268" y="142" width="62" height="38" rx="16" fill="#4A3FA8" stroke="#3A2F8F" strokeWidth="4" />
            <rect x="350" y="140" width="62" height="38" rx="16" fill="#4A3FA8" stroke="#3A2F8F" strokeWidth="4" />
            <path d="M330 158 L350 157" stroke="#3A2F8F" strokeWidth="6" fill="none" />
            <path d="M276 150 Q292 140 314 148" stroke="#C9C1F5" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M358 148 Q374 138 396 146" stroke="#C9C1F5" strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          <g className="pawR">
            <ellipse cx="404" cy="292" rx="22" ry="17" fill="#F4F2FF" stroke="#5B4FC7" strokeWidth="4" />
          </g>
          <ellipse cx="278" cy="294" rx="22" ry="17" fill="#F4F2FF" stroke="#5B4FC7" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}
