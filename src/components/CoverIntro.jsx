const BOOK_COVER_SRC = `${import.meta.env.BASE_URL || '/'}icons/book/m_cover2.png`;

export default function CoverIntro({ onEnter }) {
  return (
    <main className="cover-intro" aria-label="Open guidebook">
      <button className="cover-book-button" type="button" onClick={onEnter} aria-label="Enter guidebook">
        <img className="cover-book-image" src={BOOK_COVER_SRC} alt="" draggable="false" />
      </button>
    </main>
  );
}
