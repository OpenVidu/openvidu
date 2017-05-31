import { OpenviduSampleAppPage } from './app.po';

describe('openvidu-sample-app App', () => {
  let page: OpenviduSampleAppPage;

  beforeEach(() => {
    page = new OpenviduSampleAppPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
