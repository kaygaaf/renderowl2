import React from 'react';
import {Composition} from 'remotion';
import {CaptionedVideo} from './CaptionedVideo';
import type {CaptionSegment, CaptionStyle} from './types';

export type CaptionCompositionProps = {
  videoSrc?: string;
  backgroundColor?: string;
  captions: CaptionSegment[];
  captionStyle?: CaptionStyle;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<any, CaptionCompositionProps>
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={30 * 10}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          backgroundColor: '#000',
          captions: []
        }}
      />
    </>
  );
};
