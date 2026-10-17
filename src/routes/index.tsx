import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flower2, Lamp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import goluHome from "@/assets/golu-home.jpg";
import ganesha from "@/assets/golu/ganesha.png";
import krishna from "@/assets/golu/krishna.png";
import marapachi from "@/assets/golu/marapachi.png";
import dancer from "@/assets/golu/dancer.png";
import brassLamp from "@/assets/golu/brass-lamp.png";
import garland from "@/assets/golu/garland.png";
import kolam from "@/assets/golu/kolam.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Golu Veedu | Your Golu. Your Tradition. Your Home." },
      { name: "description", content: "Create your dream Golu for Navaratri. Choose your bommai, decorate your steps, and bring your tradition home." },
      { property: "og:title", content: "Golu Veedu | Your Golu. Your Tradition. Your Home." },
      { property: "og:description", content: "Create your dream Golu for Navaratri with traditional bommai, silk, flowers, and lamps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const howItWorks = [
    ["01", "Choose your steps", "Begin with three, five, seven, or nine tiers."],
    ["02", "Find your bommai", "Bring home beloved figures and family favourites."],
    ["03", "Make it yours", "Add silk, flowers, lamps, and little details."],
    ["04", "Keep the memory", "Save your arrangement or share it with family."],
  ];
  const collections = [
    { name: "Divine beginnings", type: "Gods & goddesses", image: ganesha, mark: "01" },
    { name: "Stories in silk", type: "Krishna & the epics", image: krishna, mark: "02" },
    { name: "The wooden pair", type: "Marapachi dolls", image: marapachi, mark: "03" },
    { name: "Grace in motion", type: "Arts & culture", image: dancer, mark: "04" },
  ];
  const decorations = [
    { name: "Flower garlands", image: garland },
    { name: "Brass lamps", image: brassLamp },
    { name: "Kolam designs", image: kolam },
  ];

  return (
    <main id="top" className="golu-homepage">
      <header className="golu-home-nav">
        <Link to="/" className="golu-wordmark"><span className="golu-brand-stamp">கொ</span><span>Golu Veedu</span></Link>
        <nav aria-label="Main navigation" className="golu-home-links"><a href="#how-it-works">The experience</a><a href="#collections">Bommai & more</a></nav>
        <Button asChild variant="default" size="sm"><Link to="/designer">Create your Golu <ArrowRight size={16} /></Link></Button>
      </header>

      <section className="golu-home-hero">
        <img className="golu-home-hero-photo" src={goluHome} alt="Traditional South Indian Navaratri Golu on silk-covered steps in a family home" width={1536} height={1024} fetchPriority="high" />
        <div className="golu-home-hero-shade" />
        <div className="golu-home-hero-copy">
          <span className="golu-eyebrow">A LITTLE HOME FOR A TIMELESS TRADITION</span>
          <h1>Create your<br /><em>dream Golu</em> at home.</h1>
          <p>Choose your favourite bommai, decorate your steps, and bring your Navaratri imagination to life.</p>
          <div className="golu-home-hero-actions"><Button asChild size="lg" variant="hero"><Link to="/designer">Create my Golu <ArrowRight size={18} /></Link></Button><a className="golu-home-secondary" href="#collections">Explore collections <span>↓</span></a></div>
          <div className="golu-hero-footnote"><span /> MADE FOR YOUR FAMILY, YOUR WAY</div>
        </div>
        <div className="golu-hero-image-label"><span>01 / THE NAVARATRI HOME</span><i /></div>
      </section>

      <section className="golu-intro-band" id="how-it-works">
        <div className="golu-intro-title"><span className="golu-eyebrow">THE JOY OF ARRANGING</span><h2>Every step tells<br />a little story.</h2></div>
        <div className="golu-how-list">{howItWorks.map(([number, title, description]) => <article className="golu-how-item" key={number}><span className="golu-how-number">{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight className="golu-how-arrow" size={17} /></article>)}</div>
      </section>

      <section className="golu-collections-section" id="collections">
        <div className="golu-section-heading"><div><span className="golu-eyebrow">THE BOMMAI COLLECTION</span><h2>Old favourites.<br /><em>New memories.</em></h2></div><p>Little treasures, lovingly brought together for your home and the stories you share.</p></div>
        <div className="golu-collection-grid">{collections.map((item) => <article className="golu-collection-card" key={item.name}><div className="golu-collection-art"><span className="golu-collection-index">{item.mark}</span><img src={item.image} alt={item.name} loading="lazy" /></div><div className="golu-collection-info"><div><span>{item.type}</span><h3>{item.name}</h3></div><ArrowRight size={18} /></div></article>)}</div>
        <div className="golu-decor-strip"><div className="golu-decor-intro"><Flower2 size={18} /><span>And all the little details</span></div>{decorations.map((item) => <div className="golu-decor-item" key={item.name}><img src={item.image} alt="" loading="lazy" /><span>{item.name}</span></div>)}</div>
      </section>

      <section className="golu-home-cta">
        <div className="golu-cta-lights"><Lamp size={25} /><Sparkles size={17} /></div>
        <span className="golu-eyebrow">YOUR GOLU. YOUR TRADITION. YOUR HOME.</span>
        <h2>Your Golu story<br /><em>starts here.</em></h2>
        <Button asChild size="lg" variant="hero"><Link to="/designer">Start decorating <ArrowRight size={18} /></Link></Button>
        <div className="golu-cta-signoff">With love, from Golu Veedu <span>♥</span></div>
      </section>
      <footer className="golu-home-footer"><span>Golu Veedu</span><span>A home for your Navaratri stories</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to top ↑</a></footer>
    </main>
  );
}
