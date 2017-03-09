import { OpenviduNgTestappPage } from './app.po';

describe('openvidu-ng-testapp App', () => {
  let page: OpenviduNgTestappPage;

  beforeEach(() => {
    page = new OpenviduNgTestappPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
