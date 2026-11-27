// Footer studio credit: Silverlight DevTech mark, copyright, license link and a link back to the apps homepage.
const LICENSE_URL = 'https://github.com/lance6x5/pto-planner/blob/main/LICENSE.md';
const HOMEPAGE_URL = 'https://lance6x5.github.io/';

export default function StudioCredit() {
  return (
    <p className="studio-credit">
      <img src={`${import.meta.env.BASE_URL}silverlight-mark.svg`} alt="" width="16" height="16" />
      <span>A Silverlight DevTech project</span>
      <span aria-hidden="true">·</span>
      <span>© 2026 Silverlight DevTech</span>
      <span aria-hidden="true">·</span>
      <a href={LICENSE_URL}>Noncommercial license</a>
      <span aria-hidden="true">·</span>
      <a href={HOMEPAGE_URL}>More apps</a>
    </p>
  );
}
