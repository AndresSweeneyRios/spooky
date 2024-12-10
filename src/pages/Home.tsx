import React, { Fragment } from 'react';
import { Viewport } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';

export default function Home() {
  return (
    <Fragment>
      <Viewport />
      <DialogueBox />
    </Fragment>
  )
}