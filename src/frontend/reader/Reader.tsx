/**
 * @File   : Reader.tsx
 * @Author : dtysky (dtysky@outlook.com)
 * @Link   : dtysky.moe
 * @Date   : 2022/9/16 23:11:48
 */
import * as React from 'react';
import {Sidebar, Loading, Modal} from 'hana-ui';

import bk from '../../backend';
import webdav from '../webdav';
import {EJumpAction, Viewer} from './Viewer';
import {IBook, IBookConfig, IBookNote, } from '../../interfaces/protocols';
import {buildStyleUrl, changeNote, checkNoteMark, IBookIndex, INoteMarkStatus} from './common';
import {Menu} from './Menu';
import {Indexes} from './Indexes';
import {Notes} from './Notes';
import {PageCtr} from './PageCtr';

import css from '../styles/reader.module.scss';
import {ISystemSettings} from '../../interfaces';

export interface IReaderProps {
  book: IBook;
  onClose(config: IBookConfig): void;
}

type TState = 'Init' | 'Loading' | 'Parser' | 'Ready';

let jump: (action: EJumpAction, cfiOrPageOrIndex?: string | number | IBookIndex) => void;
export default function Reader(props: IReaderProps) {
  const [state, setState] = React.useState<TState>('Init');
  const [readSettings, setReadSettings] = React.useState<ISystemSettings['read']>();
  const [content, setContent] = React.useState<ArrayBuffer>();
  const [pages, setPages] = React.useState<string>();
  const [bookmarks, setBookmarks] = React.useState<IBookNote[]>([]);
  const [notes, setNotes] = React.useState<IBookNote[]>([]);
  const [indexes, setIndexes] = React.useState<IBookIndex[]>();
  const [currentIndex, setCurrentIndex] = React.useState<IBookIndex>();
  const [range, setRange] = React.useState<{start: number, max: number}>();
  const [progress, setProgress] = React.useState<number>(1);
  const [lastProgress, setLastProgress] = React.useState<number>(1);
  const [ts, setTs] = React.useState<number>(0);
  const [showJumpModal, setShowJumpModal] = React.useState<boolean>(false);
  const [bookmarkInfo, setBookmarkInfo] = React.useState<IBookNote>();
  const [bookmarkStatus, setBookmarkStatus] = React.useState<INoteMarkStatus>();
  const [showIndexes, setShowIndexes] = React.useState<boolean>(false);
  const [showNotes, setShowNotes] = React.useState<boolean>(false);
  const [loadingInfo, setLoadingInfo] = React.useState<string>('');

  const saveConfig = () => webdav.saveConfig(props.book, {
    ts, lastProgress: progress, progress, notes, bookmarks
  });

  React.useEffect(() => {
    if (state === 'Init') {
      setState('Loading');
      setLoadingInfo(`书籍《${props.book.name}》加载中...若首次打开可能需要较长时间。`)
      bk.worker.setBackground(251 / 255, 240 / 255, 217 / 255)
      
      bk.worker.loadSettings().then(settings => {
        setReadSettings(settings.read);
        return webdav.loadBook(props.book);
      }).then(book => {
        setContent(book.content);
        setPages(book.pages);
        setBookmarks(book.config.bookmarks);
        setNotes(book.config.notes);
        setProgress(book.config.progress);
        setLastProgress(book.config.lastProgress);
        setTs(book.config.ts);
        setState('Ready');
      }).catch(error => {
        console.error(error);
      });

      return;
    }
  });

  return (
    <div className={css.reader} onBlur={saveConfig}>
      {
        state === 'Ready' && (
          <>
            <div className={css.top}>
              <Menu
                bookmarkStatus={bookmarkStatus}
                onReturn={() => props.onClose({ts: Date.now(), lastProgress: progress, progress, notes, bookmarks})}
                onSync={async () => {
                  setLoadingInfo('同步中...');
                  const config = await webdav.syncBook(props.book, {ts, lastProgress, progress, notes, bookmarks});
                  setBookmarks(config.bookmarks);
                  setNotes(config.notes);
                  setLastProgress(config.lastProgress);
                  setLoadingInfo('');
                }}
                onIndexes={() => {
                  setShowIndexes(!showIndexes);
                  setShowNotes(false);
                }}
                onNotes={() => {
                  setShowNotes(!showNotes);
                  setShowIndexes(false);
                }}
                onBookmark={() => {
                  setBookmarkStatus(changeNote(bookmarks, bookmarkInfo, bookmarkStatus));
                  saveConfig();
                }}
              />
            </div>
            <div className={css.bottom}>
              <div>
                {(showIndexes || showNotes) && (
                  <div
                    className={`${css.indexesBg}`}
                    onClick={() => {
                      setShowIndexes(false);
                      setShowNotes(false);
                    }}
                  />
                )}
                <Sidebar
                  className={`${css.notes}`}
                  open={showIndexes || showNotes}
                >
                  {
                    showIndexes ? (
                      <Indexes
                        indexes={indexes}
                        current={currentIndex}
                        onSelect={index => {
                          jump(EJumpAction.Index, index);
                          setCurrentIndex(index);
                        }}
                      />
                    ) : showNotes ? (
                      <Notes
                        bookmarks={bookmarks}
                        notes={notes}
                        onJump={note => jump?.(EJumpAction.CFI, note.start)}
                      />    
                    ) : null
                  }
                </Sidebar>
              </div>
              <Viewer
                bookStyle={buildStyleUrl(readSettings)}
                content={content}
                pages={pages}
                bookmarks={bookmarks}
                notes={notes}
                onLoad={async (indexes, pgs, jumpTo) => {
                  if (!pages) {
                    await webdav.savePages(props.book, pgs);
                  }
                  setIndexes(indexes);
                  setCurrentIndex(indexes[0]);
                  setRange({start: 1, max: pgs.length});
                  jump = jumpTo;
                  jump(EJumpAction.Page, progress);

                  if (lastProgress !== progress) {
                    setShowJumpModal(true);
                  }

                  setLoadingInfo('');
                }}
                onProgress={p => {
                  setTs(Date.now());
                  setProgress(p);
                  setLastProgress(p);
                }}
                onBookmarkInfo={info => {
                  if (info !== bookmarkInfo) {
                    setBookmarkInfo(info);
                    setBookmarkStatus(checkNoteMark(bookmarks, info.start, info.end));
                  }
                }}
                onChangeNotes={newNotes => {
                  setNotes(newNotes);
                  saveConfig();
                }}
              />
              {
                range && (
                  <PageCtr
                    start={range.start}
                    max={range.max}
                    current={progress}
                    onPre={() => jump(EJumpAction.Pre)}
                    onNext={() => jump(EJumpAction.Next)}
                    onJump={p => {
                      setTs(Date.now());
                      setProgress(p);
                      setLastProgress(p);
                      jump(EJumpAction.Page, p)
                    }}
                  />
                )
              }
            </div>
          </>
        )
      }

      {loadingInfo && (
        <Loading
          mode='queue'
          content={loadingInfo}
        />
      )}

      <Modal
        show={showJumpModal}
        confirm={() => {
          jump(EJumpAction.Page, lastProgress);
          setProgress(lastProgress);
          setShowJumpModal(false);
        }}
        cancel={() => {
          setLastProgress(progress);
          setShowJumpModal(false);
        }}
      >
        检测到最新阅读进度{lastProgress}，当前{progress}，是否跳转？
      </Modal>
    </div>
  );
}
