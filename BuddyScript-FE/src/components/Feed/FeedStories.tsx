'use client';

type DesktopStory = {
  id: string;
  background: string;
  name: string;
  mini?: string;
  yourStory?: boolean;
  hideOnMobile?: boolean;
};

type MobileStory = {
  id: string;
  image: string;
  title: string;
  variant: 'default' | 'active' | 'inactive';
  yourStory?: boolean;
};

const desktopStories: DesktopStory[] = [
  {
    id: 'my-story',
    background: '/assets/images/card_ppl1.png',
    name: 'Your Story',
    yourStory: true,
  },
  {
    id: 'story-1',
    background: '/assets/images/card_ppl2.png',
    name: 'Ryan Roslansky',
    mini: '/assets/images/mini_pic.png',
  },
  {
    id: 'story-2',
    background: '/assets/images/card_ppl3.png',
    name: 'Ryan Roslansky',
    mini: '/assets/images/mini_pic.png',
    hideOnMobile: true,
  },
  {
    id: 'story-3',
    background: '/assets/images/card_ppl4.png',
    name: 'Ryan Roslansky',
    mini: '/assets/images/mini_pic.png',
    hideOnMobile: true,
  },
];

const mobileStories: MobileStory[] = [
  {
    id: 'mobile-my-story',
    image: '/assets/images/mobile_story_img.png',
    title: 'Your Story',
    variant: 'default',
    yourStory: true,
  },
  {
    id: 'mobile-1',
    image: '/assets/images/mobile_story_img1.png',
    title: 'Ryan...',
    variant: 'active',
  },
  {
    id: 'mobile-2',
    image: '/assets/images/mobile_story_img2.png',
    title: 'Ryan...',
    variant: 'inactive',
  },
  {
    id: 'mobile-3',
    image: '/assets/images/mobile_story_img1.png',
    title: 'Ryan...',
    variant: 'active',
  },
  {
    id: 'mobile-4',
    image: '/assets/images/mobile_story_img2.png',
    title: 'Ryan...',
    variant: 'inactive',
  },
  {
    id: 'mobile-5',
    image: '/assets/images/mobile_story_img1.png',
    title: 'Ryan...',
    variant: 'active',
  },
  {
    id: 'mobile-6',
    image: '/assets/images/mobile_story_img.png',
    title: 'Ryan...',
    variant: 'default',
  },
  {
    id: 'mobile-7',
    image: '/assets/images/mobile_story_img1.png',
    title: 'Ryan...',
    variant: 'active',
  },
];

const DesktopStoryCard = ({ story }: { story: DesktopStory }) => {
  if (story.yourStory) {

    console.log(story,'safwan')
    return (
      <div className="_feed_inner_profile_story _b_radious6">
        <div className="_feed_inner_profile_story_image">
          <img src={story.background} alt={story.name} className="_profile_story_img" />
          <div className="_feed_inner_story_txt">
            <div className="_feed_inner_story_btn">
              <button className="_feed_inner_story_btn_link" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 10 10">
                  <path stroke="#fff" strokeLinecap="round" d="M.5 4.884h9M4.884 9.5v-9" />
                </svg>
              </button>
            </div>
            <p className="_feed_inner_story_para">{story.name}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="_feed_inner_public_story _b_radious6">
      <div className="_feed_inner_public_story_image">
        <img src={story.background} alt={story.name} className="_public_story_img" />
        <div className="_feed_inner_pulic_story_txt">
          <p className="_feed_inner_pulic_story_para">{story.name}</p>
        </div>
        {story.mini && (
          <div className="_feed_inner_public_mini">
            <img src={story.mini} alt="Story owner" className="_public_mini_img" />
          </div>
        )}
      </div>
    </div>
  );
};

const storyVariantClass = (variant: MobileStory['variant']): string => {
  if (variant === 'active') {
    return '_feed_inner_ppl_card_area_story_active';
  }

  if (variant === 'inactive') {
    return '_feed_inner_ppl_card_area_story_inactive';
  }

  return '_feed_inner_ppl_card_area_story';
};

const MobileStoryCard = ({ story }: { story: MobileStory }) => {
  const labelClass = story.yourStory
    ? '_feed_inner_ppl_card_area_link_txt'
    : '_feed_inner_ppl_card_area_txt';
  const imageClass = story.variant === 'default' ? '_card_story_img' : '_card_story_img1';

  return (
    <li className="_feed_inner_ppl_card_area_item">
      <a href="#0" className="_feed_inner_ppl_card_area_link">
        <div className={storyVariantClass(story.variant)}>
          <img src={story.image} alt={story.title} className={imageClass} />
          {story.yourStory && (
            <div className="_feed_inner_ppl_btn">
              <button className="_feed_inner_ppl_btn_link" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 12 12">
                  <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" d="M6 2.5v7M2.5 6h7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <p className={labelClass}>{story.title}</p>
      </a>
    </li>
  );
};

export default function FeedStories() {

  return (
    <>
      <div className="_feed_inner_ppl_card _mar_b16">
        <div className="_feed_inner_story_arrow">
          <button type="button" className="_feed_inner_story_arrow_btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="8" fill="none" viewBox="0 0 9 8">
              <path fill="#fff" d="M8 4l.366-.341.318.341-.318.341L8 4zm-7 .5a.5.5 0 010-1v1zM5.566.659l2.8 3-.732.682-2.8-3L5.566.66zm2.8 3.682l-2.8 3-.732-.682 2.8-3 .732.682zM8 4.5H1v-1h7v1z" />
            </svg>
          </button>
        </div>

        <div className="row">
          {desktopStories.map((story) => (
            <div
              key={story.id}
              className={`col-xl-3 col-lg-3 col-md-4 col-sm-4 col${story.hideOnMobile ? ' _custom_mobile_none' : ''}`}
            >
              <DesktopStoryCard story={story} />
            </div>
          ))}
        </div>
      </div>

      <div className="_feed_inner_ppl_card_mobile _mar_b16">
        <div className="_feed_inner_ppl_card_area">
          <ul className="_feed_inner_ppl_card_area_list">
            {mobileStories.map((story) => (
              <MobileStoryCard key={story.id} story={story} />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
